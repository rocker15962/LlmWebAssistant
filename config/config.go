package config

import (
	"os"
)

// GetPort 返回服務器端口
func GetPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默認端口
	}
	return port
}

// GetLLMAPIKey 返回 LLM API 密鑰
func GetLLMAPIKey() string {
	return os.Getenv("LLM_API_KEY")
}

// GetLLMAPIURL 返回 LLM API URL
func GetLLMAPIURL() string {
	url := os.Getenv("LLM_API_URL")
	if url == "" {
		// 默認使用 OpenAI API
		url = "https://api.openai.com/v1/chat/completions"
	}
	return url
}

// GetWebSearchAPIURL 返回 Web Search API URL
func GetWebSearchAPIURL() string {
	url := os.Getenv("WEB_SEARCH_API_URL")
	if url == "" {
		// 默認使用 OpenAI API 的 responses 端點
		url = "https://api.openai.com/v1/responses"
	}
	return url
}

// IsProduction 檢查是否為生產環境
func IsProduction() bool {
	return os.Getenv("GIN_MODE") == "release"
}

// GetMaxContentLength 返回最大內容長度限制
func GetMaxContentLength() int {
	return 100000 // 約 100KB
}

// GetMaxImageSize 返回最大圖像大小限制
func GetMaxImageSize() int {
	return 1024 * 1024 * 5 // 5MB
} 