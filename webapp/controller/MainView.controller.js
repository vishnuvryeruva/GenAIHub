sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"],
  function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.sap.trial.fioriai.controller.MainView", {
      onInit: function () {
        const oUiModel = new JSONModel({
          busy: false,
          summary: {
            txtInput: "",
            txtSummary: "",
          },
          chatbot: {
            txtInput: "",
            messages: [
              {
                role: "system",
                content: "You are a helpful AI Assistant who can help user queries about SAP technologies. Graciously to answer questions that are not related to SAP."
              },
              {
                role: "assistant",
                content: "Hello, I am your Chatbot. How can I help you?",
              }
            ],
          },
        });

        this.getView().setModel(oUiModel, "ui");
      },

      onBtnSummaryPress: async function () {
        const oUiModel = this.getView().getModel("ui");
        const sTxtInput = oUiModel.getProperty("/summary/txtInput");
        oUiModel.setProperty("/busy", true);
        
        try {
          // Using Hugging Face API for summarization (BART model)
          const response = await fetch(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // You'll need to replace this with your own API key from https://huggingface.co/settings/tokens
                "Authorization": "Bearer hf_kqLipGPXUqVTakDYRVwtWZVHoLkijaSvdAj"
              },
              body: JSON.stringify({
                inputs: sTxtInput,
                parameters: {
                  max_length: 100,
                  min_length: 30
                }
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          
          const result = await response.json();
          const txtSummary = result[0]?.summary_text || "No summary could be generated.";
          oUiModel.setProperty("/summary/txtSummary", txtSummary);
        } catch (error) {
          console.error("Summarization API error:", error);
          oUiModel.setProperty("/summary/txtSummary", 
            "Could not generate a summary. Hugging Face API might be temporarily unavailable or the API key needs to be updated.");
        } finally {
          oUiModel.setProperty("/busy", false);
        }
      },

      onBtnChatbotSendPress: async function () {
        const oUiModel = this.getView().getModel("ui");
        const txtInput = oUiModel.getProperty("/chatbot/txtInput");
        const oMessages = [
          ...oUiModel.getProperty("/chatbot/messages"),
          {
            role: "user",
            content: txtInput
          },
        ];
        oUiModel.setProperty("/chatbot/messages", oMessages);
        oUiModel.setProperty("/chatbot/txtInput", "");
        oUiModel.setProperty("/busy", true);
        
        try {
          // For chat functionality, we'll use a different HF model that's better for conversations
          const lastUserMessage = txtInput;
          const conversationHistory = oMessages
            .filter(msg => msg.role !== "system")
            .map(msg => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
            .join("\n");
            
          const response = await fetch(
            "https://api-inference.huggingface.co/models/google/flan-t5-xl",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // You'll need to replace this with your own API key from https://huggingface.co/settings/tokens
                "Authorization": "Bearer hf_kqLipGPXUqVTakDYRVwtWZVHoLkijaSvdAj"
              },
              body: JSON.stringify({
                inputs: conversationHistory + "\nHuman: " + lastUserMessage + "\nAssistant:"
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          
          const result = await response.json();
          const aiResponse = result[0]?.generated_text || "I'm sorry, I couldn't generate a response.";
          
          oMessages.push({
            role: "assistant",
            content: aiResponse
          });
          oUiModel.setProperty("/chatbot/messages", oMessages);
        } catch (error) {
          console.error("Chat API error:", error);
          oMessages.push({
            role: "assistant",
            content: "I'm sorry, I'm having trouble connecting to my language model. Please try again later."
          });
          oUiModel.setProperty("/chatbot/messages", oMessages);
        } finally {
          oUiModel.setProperty("/busy", false);
        }
      },

      /**
       * Gets the URL prefix of the app
       * @returns {string} the URL module prefix
       */
      _getUrlModulePrefix() {
        return $.sap.getModulePath(
          this.getOwnerComponent().getManifestEntry("/sap.app/id")
        );
      }
    });
  }
);
