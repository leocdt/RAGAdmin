from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from django.conf import settings
import logging
from sentence_transformers import SentenceTransformer
from datetime import datetime
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, vector_store_service, model_name="llama2"):
        self.vector_store_service = vector_store_service
        self.chat_histories = {}  # Dictionary to store histories for each chat ID
        self.model_name = model_name
        self.llm = Ollama(model=self.model_name)
        
        # Initialiser l'encoder une seule fois
        self.encoder = SentenceTransformer("paraphrase-mpnet-base-v2")
        
        # Définir la fonction d'embedding personnalisée
        self.embedding_function = lambda texts: self.encoder.encode(texts).tolist()
        
        # Configurer ChromaDB avec la fonction d'embedding personnalisée
        self.vector_store = Chroma(
            collection_name="documents",
            embedding_function=self.embedding_function
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1024,
            chunk_overlap=80,
            length_function=len,
            is_separator_regex=False
        )
        
        self.raw_prompt = PromptTemplate.from_template(
            """
            You are RAGAdmin, a technical assistant powered by LLama. Here are your session details:
            - Session ID: {chat_id}
            - Current Date: {current_date}
            - Model:
            - Knowledge cutoff: 2023
            
            Instructions:
            1. If the question is general (like math, common knowledge, or coding) and doesn't require the document context, ignore the document context completely
            2. Only use the document context when the question specifically relates to the information in the documents
            3. If you don't have enough information from the documents when needed, say so
            4. Keep responses clear and concise
            5. For general questions (math, coding, etc.), use your built-in knowledge
            
            Context from documents (only use if relevant to the question):
            {context}

            Current chat history:
            {chat_history}

            Question: {input}

            Remember: First determine if the question requires document context. If not, ignore the document context completely and answer based on your general knowledge. Do not make assumptions beyond the provided information or the document context.
            Respond in the same language as the question.
            """
        )

    def should_use_context(self, query: str) -> bool:
        """Determine if the query needs document context."""
        context_check_prompt = PromptTemplate.from_template(
            """
            Determine if this question requires accessing document/file context.
            Question: {query}
            
            Instructions:
            1. Respond with 'YES' if the question:
               - Mentions any character names (like Alice, White Rabbit, etc.)
               - References any book or document content
               - Asks about specific document information
               - Contains terms that might be found in uploaded documents
            2. The response must be exactly 'YES' or 'NO' (case sensitive)
            
            Current question analysis:
            1. Does it mention any names or characters? (Alice, etc.)
            2. Does it ask about document content?
            3. Is it seeking specific information that would be in documents?

            Response (YES/NO):
            """
        )
        
        response = self.llm.invoke(context_check_prompt.format(query=query))
        print(f"\n=== Context Check Details ===")
        print(f"Query: {query}")
        print(f"Raw response: {response}")
        print(f"Final decision: {response.strip().upper() == 'YES'}")
        
        return response.strip().upper() == 'YES'

    def generate_response(self, query: str, chat_id: str, history: list = None):
        try:
            # Initialize or get chat history for this specific chat_id
            if chat_id not in self.chat_histories:
                self.chat_histories[chat_id] = []
            
            # Format the history for this specific chat
            formatted_history = ""
            if history:
                self.chat_histories[chat_id] = []  # Reset history for this chat
                formatted_messages = []  # Initialize the list here
                for msg in history:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    if role == 'human':
                        self.chat_histories[chat_id].append({"role": "human", "content": content})
                        formatted_messages.append(f"Human: {content}")
                    elif role in ['assistant', 'ai']:  # Handle both 'assistant' and 'ai' roles
                        self.chat_histories[chat_id].append({"role": "assistant", "content": content})
                        formatted_messages.append(f"Assistant: {content}")
                formatted_history = "\n".join(formatted_messages)

            print(f"\n=== Chat History ===")
            print(formatted_history)
            
            # Check if we need document context
            needs_context = self.should_use_context(query)
            print(f"\n=== Context Check ===")
            print(f"Query: {query}")
            print(f"Needs context: {needs_context}")
            
            if needs_context:
                # Get documents from vector store
                vector_store = self.vector_store_service.vector_store
                
                # Print vector store status
                collection_size = len(vector_store.get()['ids'])
                print(f"\n=== Vector Store Status ===")
                print(f"Total documents in store: {collection_size}")
                
                # First get documents directly
                results = vector_store.similarity_search(
                    query,
                    k=5,
                    filter=None
                )
                
                print(f"\n=== Retrieved Documents ===")
                print(f"Number of documents found: {len(results)}")
                for idx, doc in enumerate(results):
                    print(f"\nDocument {idx + 1}:")
                    print(f"Content preview: {doc.page_content[:200]}...")
                    print(f"Metadata: {doc.metadata}")
                
                retriever = vector_store.as_retriever(
                    search_type="similarity_score_threshold",
                    search_kwargs={
                        "k": 5,
                        "score_threshold": 0.1,  # Lowered from 0.5 to 0.1
                    }
                )
                
                # Create document chain with specific prompt
                document_prompt = PromptTemplate.from_template(
                    """
                    You are RAGAdmin, a technical assistant. Answer questions based on the provided document context.
                    
                    Context from documents:
                    {context}

                    Current chat history:
                    {chat_history}

                    Question: {input}

                    Instructions:
                    1. ONLY use information from the context above
                    2. Synthesize a complete and coherent answer from all relevant context
                    3. For character questions, include:
                       - Who they are
                       - Their key characteristics
                       - Important interactions or events
                    4. Use direct quotes when relevant
                    5. If multiple context pieces provide information, combine them logically
                    6. Do not make up or infer information not present in the context
                    
                    Answer:
                    """
                )

                # Create document chain
                document_chain = create_stuff_documents_chain(
                    llm=self.llm,
                    prompt=document_prompt
                )

                # Create retrieval chain
                retrieval_chain = create_retrieval_chain(
                    retriever=retriever,
                    combine_docs_chain=document_chain
                )

                # Get response
                response = retrieval_chain.invoke({
                    "input": query,
                    "chat_history": formatted_history,
                    "chat_id": chat_id,
                    "current_date": datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S UTC")
                })
                
                print(f"\n=== Final Response ===")
                print(f"Answer: {response['answer']}")
                if 'context' in response:
                    print(f"\n=== Context Used ===")
                    print(response['context'])
                
                answer = response["answer"]

            else:
                # Direct LLM response for non-document queries
                direct_prompt = PromptTemplate.from_template(
                    """
                    You are RAGAdmin, a technical assistant powered by LLama. Here are your session details:
                    - Session ID: {chat_id}
                    - Current Date: {current_date}
                    
                    Previous conversation:
                    {chat_history}
                    
                    Question: {input}
                    
                    Provide a clear and concise response based on your general knowledge.
                    """
                )
                
                answer = self.llm.invoke(direct_prompt.format(
                    chat_id=chat_id,
                    current_date=datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S UTC"),
                    chat_history=formatted_history,
                    input=query
                ))

            # Update chat history
            self.chat_histories[chat_id].append({"role": "human", "content": query})
            self.chat_histories[chat_id].append({"role": "assistant", "content": answer})

            return answer

        except Exception as e:
            print(f"\n=== Error ===")
            print(f"Error generating response: {str(e)}")
            logger.error(f"Error generating response in chat {chat_id}: {str(e)}")
            raise