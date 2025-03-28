package models

// LLMRequest 表示從前端發送的請求
type LLMRequest struct {
	Question     string `json:"question" binding:"required"`
	URL          string `json:"url" binding:"required"`
	Title        string `json:"title" binding:"required"`
	Screenshot   string `json:"screenshot"`
	PageContent  string `json:"pageContent"`
	UseWebSearch bool   `json:"useWebSearch"`
}

// LLMResponse 表示發送給前端的響應
type LLMResponse struct {
	Answer         string `json:"answer"`
	PromptTokens   int    `json:"promptTokens,omitempty"`
	CompletionTokens int  `json:"completionTokens,omitempty"`
	TotalTokens    int    `json:"totalTokens,omitempty"`
}

// OpenAIMessage 表示 OpenAI API 消息格式
type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAITool 表示 OpenAI API 工具格式
type OpenAITool struct {
	Type string `json:"type"`
}

// OpenAIRequest 表示 OpenAI API 請求格式
type OpenAIRequest struct {
	Model       string          `json:"model"`
	Messages    []OpenAIMessage `json:"messages"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
	Tools       []OpenAITool    `json:"tools,omitempty"`
}

// OpenAIResponse 表示 OpenAI API 響應格式
type OpenAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int    `json:"created"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// AskRequest 定義了從前端發送的問答請求
type AskRequest struct {
	Question     string `json:"question"`
	URL          string `json:"url"`
	Title        string `json:"title"`
	PageContent  string `json:"pageContent"`
	Screenshot   string `json:"screenshot"`
	UseWebSearch bool   `json:"useWebSearch"`
	IsSimple     bool   `json:"isSimple"`
}

// TokenUsage 定義了 token 使用量
type TokenUsage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}

// AskResponse 定義了回答的響應格式
type AskResponse struct {
	Answer string     `json:"answer"`
	Usage  TokenUsage `json:"usage"`
} 