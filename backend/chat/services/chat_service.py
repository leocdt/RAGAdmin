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
            Respond in French
            Question: {input}
            Context: {context}
            """
        )

    def generate_response(self, query: str):
        try:
            vector_store = self.vector_store_service.vector_store
            
            retriever = vector_store.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "k": 20,
                    "score_threshold": 0.1,
                },
            )

            retriever_prompt = ChatPromptTemplate.from_messages([
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                (
                    "human",
                    "Given the above conversation, generate a search query to lookup in order to get information relevant to the conversation",
                ),
            ])

            history_aware_retriever = create_history_aware_retriever(
                llm=self.llm,
                retriever=retriever,
                prompt=retriever_prompt
            )

            document_chain = create_stuff_documents_chain(self.llm, self.raw_prompt)
            retrieval_chain = create_retrieval_chain(
                history_aware_retriever,
                document_chain,
            )

            result = retrieval_chain.invoke({"input": query})
            
            # Update chat history
            self.chat_history.append(HumanMessage(content=query))
            self.chat_history.append(AIMessage(content=result["answer"]))

            return result["answer"]

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise