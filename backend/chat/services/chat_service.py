from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, vector_store_service):
        self.vector_store_service = vector_store_service
        self.chat_history = []
        self.llm = Ollama(model=settings.OLLAMA_MODEL)
        self.embedding = FastEmbedEmbeddings()
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1024,
            chunk_overlap=80,
            length_function=len,
            is_separator_regex=False
        )
        
        self.raw_prompt = PromptTemplate.from_template(
             """
            Your name is RAGAdmin, you are a technical assistant good at searching documents. If you do not have an answer from the provided information say so
            Context: {context}
            
            Previous conversation: {chat_history}
            Question: {input}

            Answer in the same language as the question.
            """
        )

    def generate_response(self, query: str, history: list = None):
        try:
            # Format chat history for prompt
            formatted_history = ""
            if history:
                self.chat_history = []
                formatted_messages = []
                for msg in history:
                    if msg['role'] == 'human':
                        self.chat_history.append(HumanMessage(content=msg['content']))
                        formatted_messages.append(f"Human: {msg['content']}")
                    else:
                        self.chat_history.append(AIMessage(content=msg['content']))
                        formatted_messages.append(f"Assistant: {msg['content']}")
                formatted_history = "\n".join(formatted_messages)

            vector_store = self.vector_store_service.vector_store
            
            retriever = vector_store.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "k": 20,
                    "score_threshold": 0.1,
                },
            )

            # Update retriever prompt to include formatted history
            retriever_prompt = ChatPromptTemplate.from_messages([
                ("system", "Previous conversation:\n{chat_history}"),
                ("human", "Current question: {input}"),
                (
                    "human",
                    "Based on this conversation history and question, what would be the best search query to find relevant information?"
                ),
            ])

            history_aware_retriever = create_history_aware_retriever(
                llm=self.llm,
                retriever=retriever,
                prompt=retriever_prompt
            )

            # Update raw prompt to include formatted history
            raw_prompt = PromptTemplate.from_template(
                """
                Your name is RAGAdmin, you are a technical assistant good at searching documents. If you do not have an answer from the provided information say so.                
                
                Context from documents:
                {context}

                Previous conversation:
                {chat_history}

                Current question: {input}
                """
            )

            document_chain = create_stuff_documents_chain(self.llm, raw_prompt)
            retrieval_chain = create_retrieval_chain(
                history_aware_retriever,
                document_chain,
            )

            # Include formatted history in the chain invocation
            result = retrieval_chain.invoke({
                "input": query,
                "chat_history": formatted_history
            })
            
            # Update chat history
            self.chat_history.append(HumanMessage(content=query))
            self.chat_history.append(AIMessage(content=result["answer"]))

            return result["answer"]

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise
