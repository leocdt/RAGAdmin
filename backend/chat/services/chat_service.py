from langchain_ollama import OllamaLLM
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.history_aware_retriever import create_history_aware_retriever
import logging
from django.conf import settings
from django.db import connection
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from datetime import datetime
from zoneinfo import ZoneInfo
import os

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, vector_store_service, model_name="llama2"):
        self.vector_store_service = vector_store_service
        self.chat_histories = {}  # Dictionary to store histories for each chat ID
        self.model_name = model_name
        self.llm = OllamaLLM(model=self.model_name)

        # Initialiser l'encoder une seule fois
        self.encoder = SentenceTransformer("paraphrase-mpnet-base-v2")

        # Définir la fonction d'embedding personnalisée
        self.embedding_function = lambda texts: self.encoder.encode(texts).tolist()

        # Configurer ChromaDB avec la fonction d'embedding personnalisée
        chroma_db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'chroma_db')
        os.makedirs(chroma_db_dir, exist_ok=True)

        self.vector_store = Chroma(
            persist_directory=chroma_db_dir,
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
            1. Use the provided document context only if the question explicitly relates to the information within these documents.
            2. When using the document context, directly quote or synthesize relevant information while ensuring clarity.
            3. If the question does not require document context, answer based on your general knowledge.
            4. If insufficient information exists in the documents to answer the query, state this clearly and proceed with general insights if applicable.
            5. Ensure responses are concise and directly address the user's query.

            Context from documents (use only if explicitly relevant):
            {context}

            Current chat history:
            {chat_history}

            Question: {input}

            Response:
            """
        )

    def should_use_context(self, query: str) -> bool:
        """Determine if the query needs document context."""
        # Get list of available documents from SQLite
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT name FROM chat_document")
                doc_names = {row[0].lower() for row in cursor.fetchall()}

            doc_list = '\n        - '.join(sorted(doc_names))
            if not doc_list:
                doc_list = "No documents found in database"
        except Exception as e:
            logger.error(f"Error getting document names from database: {e}")
            doc_list = "Error retrieving document list"

        context_check_prompt = PromptTemplate.from_template(
            """
    You are evaluating whether a question requires access to document context or if it can be answered with general knowledge.

    Available documents in the database:
        - {doc_list}

    Instructions:
    1. Respond with 'YES' if:
       - The question asks about a topic or entity that appears in the document names above
       - The question is about specific information that would be in these documents
       - The question requires access to the content of any listed document

    2. Respond with 'NO' if:
       - The question is about general knowledge (science, history, math, etc.)
       - The question can be answered with common programming knowledge
       - The question asks about universal concepts or facts
       - The question is hypothetical or theoretical
       - The question doesn't relate to any of the documents listed above

    Examples:
        - "What's in the report about X?" -> YES (if X matches any document topic)
        - "How do I write a Python loop?" -> NO (general programming)
        - "Tell me about someone" -> YES (if that person is mentioned in documents)
        - "What's 2+2?" -> NO (basic math)
        - "Who is someone?" -> YES (if they appear in documents)
        - "Why is the sky blue?" -> NO (general science)

    Query: {query}

    Think:
    1. Check if the query topic matches any words in the document names above
    2. Check if the question asks about specific document content
    3. Default to NO for general knowledge questions

    Respond in this exact format:
    ANSWER: [YES/NO]
    REASON: [Brief explanation of your decision]
    """
        )

        response = self.llm.invoke(context_check_prompt.format(doc_list=doc_list, query=query))
        print(f"\n=== Context Check Details ===")
        print(f"Query: {query}")
        print(f"Raw response: {response}")

        # Parse the response to extract the ANSWER line
        response_lines = response.strip().upper().split('\n')
        answer_line = None
        for line in response_lines:
            if line.startswith('ANSWER:'):
                answer_line = line.replace('ANSWER:', '').strip()
                break
        
        # Determine if we need context based on the answer
        if answer_line == 'YES':
            needs_context = True
        elif answer_line == 'NO':
            needs_context = False
        else:
            # Default to not using context if response is unclear
            needs_context = False
            logger.warning(f"Unclear context check response, defaulting to NO. Response: {response}")

        print(f"Final decision: {needs_context}")
        return needs_context

    def generate_response(self, query: str, chat_id: str, history: list = None):
        try:
            if chat_id not in self.chat_histories:
                self.chat_histories[chat_id] = []

            formatted_history = ""
            if history:
                self.chat_histories[chat_id] = []
                formatted_messages = []
                for msg in history:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    if role == 'human':
                        self.chat_histories[chat_id].append({"role": "human", "content": content})
                        formatted_messages.append(f"Human: {content}")
                    elif role in ['assistant', 'ai']:
                        self.chat_histories[chat_id].append({"role": "assistant", "content": content})
                        formatted_messages.append(f"Assistant: {content}")
                formatted_history = "\n".join(formatted_messages)

            print(f"\n=== Chat History ===")
            print(formatted_history)

            needs_context = self.should_use_context(query)
            print(f"\n=== Context Check ===")
            print(f"Query: {query}")
            print(f"Needs context: {needs_context}")

            if not needs_context:
                return self.llm.invoke(query)

            vector_store = self.vector_store_service.vector_store

            collection_size = len(vector_store.get()['ids'])
            print(f"\n=== Vector Store Status ===")
            print(f"Total documents in store: {collection_size}")

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
                    "score_threshold": 0.1,
                }
            )

            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT name FROM chat_document")
                    doc_names = {row[0].lower() for row in cursor.fetchall()}

                doc_list = '\n        - '.join(sorted(doc_names))
                if not doc_list:
                    doc_list = "No documents found in database"
            except Exception as e:
                logger.error(f"Error getting document names from database: {e}")
                doc_list = "Error retrieving document list"

            document_prompt = PromptTemplate.from_template(
                """
                You are RAGAdmin, a technical assistant. Answer questions based on the provided document context.

                Available documents:
                {doc_list}

                Context from documents:
                {context}

                Current chat history:
                {chat_history}

                Question: {input}

                Instructions:
                1. Use the document context above if the question explicitly relates to these documents.
                2. Directly quote or summarize document content when providing answers.
                3. If the document context is insufficient, state this and supplement with general knowledge if applicable.
                4. Do not infer information beyond the context provided.

                Response:
                """
            )

            document_chain = create_stuff_documents_chain(
                llm=self.llm,
                prompt=document_prompt
            )

            retrieval_chain = create_retrieval_chain(
                retriever=retriever,
                combine_docs_chain=document_chain
            )

            response = retrieval_chain.invoke({
                "input": query,
                "chat_history": formatted_history,
                "doc_list": doc_list,
                "chat_id": chat_id,
                "current_date": datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S UTC")
            })

            print(f"\n=== Final Response ===")
            print(f"Answer: {response['answer']}")
            if 'context' in response:
                print(f"\n=== Context Used ===")
                print(response['context'])

            answer = response["answer"]

            self.chat_histories[chat_id].append({"role": "human", "content": query})
            self.chat_histories[chat_id].append({"role": "assistant", "content": answer})

            return answer

        except Exception as e:
            print(f"\n=== Error ===")
            print(f"Error generating response: {str(e)}")
            logger.error(f"Error generating response in chat {chat_id}: {str(e)}")
            raise