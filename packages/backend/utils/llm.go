package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
	"time"

	"github.com/rocker15962/llm-web-assistant/packages/backend/config"
	"github.com/rocker15962/llm-web-assistant/packages/backend/models"
)

// AskLLMResult 包含 LLM 回答和 token 使用量
type AskLLMResult struct {
	Answer           string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

// LLMRequest 定義了發送到 LLM 的請求結構
type LLMRequest struct {
	Question     string  `json:"question"`
	URL          string  `json:"url"`
	Title        string  `json:"title"`
	Screenshot   *string `json:"screenshot,omitempty"`
	PageContent  *string `json:"pageContent,omitempty"`
	UseWebSearch bool    `json:"useWebSearch"`
	IsSimple     bool    `json:"isSimple"`
}

// AskLLM 調用 OpenAI API
func AskLLM(question, url, title, pageContent, screenshot string, useWebSearch bool, isSimple bool) (AskLLMResult, error) {
	// 準備 OpenAI 請求
	apiKey := config.GetLLMAPIKey()
	if apiKey == "" {
		return AskLLMResult{}, fmt.Errorf("未設置 LLM_API_KEY 環境變數")
	}

	var apiURL string
	var requestJSON []byte
	var err error

	if useWebSearch {
		apiURL = config.GetWebSearchAPIURL()

		// 構建包含簡單回答指示的問題
		var enhancedQuestion string
		if isSimple {
			enhancedQuestion = fmt.Sprintf("請用非常簡潔的語言回答以下問題，盡量使用簡短的句子和精簡的表達方式。回答應該直接切入重點，避免冗長的解釋。問題：%s", question)
		} else {
			enhancedQuestion = question
		}

		// 使用 responses API 格式
		webSearchRequest := map[string]interface{}{
			"model": "gpt-4o-mini",
			"tools": []map[string]interface{}{
				{
					"type": "web_search_preview",
				},
			},
			"input": enhancedQuestion,
		}

		requestJSON, err = json.Marshal(webSearchRequest)
	} else if screenshot != "" {
		// 使用圖像處理 API
		apiURL = config.GetLLMAPIURL()

		// 檢查截圖大小
		if len(screenshot) > 20*1024*1024 { // 20MB
			return AskLLMResult{}, fmt.Errorf("截圖太大，超過 20MB 限制")
		}

		// 檢查截圖格式
		if !strings.HasPrefix(screenshot, "data:image/jpeg;base64,") &&
			!strings.HasPrefix(screenshot, "data:image/png;base64,") &&
			!strings.HasPrefix(screenshot, "data:image/webp;base64,") {
			screenshot = "data:image/jpeg;base64," + strings.TrimPrefix(strings.TrimPrefix(screenshot, "data:image/"), ";base64,")
		}

		// 構建包含圖像的請求
		imageRequest := map[string]interface{}{
			"model": "gpt-4o-mini",
			"messages": []map[string]interface{}{
				{
					"role": "system",
					"content": `你是一個專門分析網頁截圖的助手。你的任務是：
1. 仔細查看用戶提供的網頁截圖
2. 識別截圖中的所有文本內容
3. 特別注意用戶問題中提到的特定元素
4. 提供準確、詳細的回答
5. 如果截圖中有表格、列表或其他結構化內容，請清晰地描述它們
6. 如果無法看清某些內容，請誠實說明`,
				},
				{
					"role": "user",
					"content": []map[string]interface{}{
						{
							"type": "text",
							"text": fmt.Sprintf("問題: %s\n\n用戶正在瀏覽的網頁:\n標題: %s\nURL: %s", question, title, url),
						},
						{
							"type": "image_url",
							"image_url": map[string]interface{}{
								"url":    screenshot,
								"detail": "low",
							},
						},
					},
				},
			},
		}

		requestJSON, err = json.Marshal(imageRequest)
	} else {
		apiURL = config.GetLLMAPIURL()

		// 準備提示詞
		req := LLMRequest{
			Question:     question,
			URL:          url,
			Title:        title,
			Screenshot:   &screenshot,
			PageContent:  &pageContent,
			UseWebSearch: useWebSearch,
			IsSimple:     isSimple,
		}
		prompt := buildPrompt(req)

		// 使用標準 chat completions API 格式
		request := models.OpenAIRequest{
			Model: "gpt-4o-mini",
			Messages: []models.OpenAIMessage{
				{
					Role:    "system",
					Content: "你是一個網頁助手，可以回答用戶關於他們正在瀏覽的網頁的問題。請簡潔明了地回答。",
				},
				{
					Role:    "user",
					Content: prompt,
				},
			},
			Temperature: 0.7,
		}

		requestJSON, err = json.Marshal(request)
	}

	if err != nil {
		return AskLLMResult{}, fmt.Errorf("無法序列化請求: %v", err)
	}

	// 使用 HTTP 客戶端發送請求
	responseBody, err := callOpenAIAPI(apiURL, apiKey, requestJSON)
	if err != nil {
		return AskLLMResult{}, fmt.Errorf("執行 OpenAI API 失敗: %v", err)
	}

	// 根據使用的 API 解析不同的響應格式
	if useWebSearch {
		return parseWebSearchResponse(responseBody)
	} else {
		return parseChatCompletionResponse(responseBody)
	}
}

// 構建提示詞
func buildPrompt(req LLMRequest) string {
	var prompt strings.Builder

	// 添加簡單回答模式的指示
	if req.IsSimple {
		prompt.WriteString("請用非常簡潔的語言回答以下問題，盡量使用簡短的句子和精簡的表達方式。回答應該直接切入重點，避免冗長的解釋。\n\n")
	}

	// 基本指示
	prompt.WriteString("你是一個網頁助手 AI，可以回答用戶關於當前網頁的問題。")

	// 添加網頁內容（如果有）
	if req.PageContent != nil && *req.PageContent != "" {
		prompt.WriteString("\n\n以下是網頁的結構化內容：\n")
		prompt.WriteString(*req.PageContent)

		// 如果是簡單回答模式，添加額外指示
		if req.IsSimple {
			prompt.WriteString("\n\n請記住：提供簡潔的回答，只包含最重要的信息，避免不必要的細節。")
		}
	}

	// 添加截圖提示（如果有）
	if req.Screenshot != nil && *req.Screenshot != "" {
		prompt.WriteString("\n\n我已附上當前網頁的截圖，請根據截圖內容回答問題。")

		// 如果是簡單回答模式，添加額外指示
		if req.IsSimple {
			prompt.WriteString("只描述截圖中與問題直接相關的內容，不需要詳細描述整個截圖。")
		}
	}

	// 添加搜索指示（如果需要）
	if req.UseWebSearch {
		prompt.WriteString("\n\n請使用網絡搜索來回答這個問題，確保提供最新、最準確的信息。")

		// 如果是簡單回答模式，添加額外指示
		if req.IsSimple {
			prompt.WriteString("搜索後提供簡短的摘要回答，不需要列出所有搜索結果或詳細解釋。")
		}
	}

	// 添加用戶問題
	prompt.WriteString("\n\n用戶問題：")
	prompt.WriteString(req.Question)

	// 最後再次強調簡潔回答（如果是簡單模式）
	if req.IsSimple {
		prompt.WriteString("\n\n請記住：你的回答應該簡短、直接，只包含最核心的信息。避免使用過多的修飾詞和解釋性語句。")
	}

	return prompt.String()
}

// 使用 HTTP 客戶端發送請求
func callOpenAIAPI(apiURL, apiKey string, requestJSON []byte) ([]byte, error) {
	// 創建請求
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(requestJSON))
	if err != nil {
		return nil, fmt.Errorf("創建請求失敗: %v", err)
	}

	// 設置標頭
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	// 發送請求
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("發送請求失敗: %v", err)
	}
	defer resp.Body.Close()

	// 讀取響應
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("讀取響應失敗: %v", err)
	}

	// 檢查狀態碼
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API 返回錯誤狀態碼: %d, 響應: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// 解析標準 chat completions 響應
func parseChatCompletionResponse(responseBody []byte) (AskLLMResult, error) {
	// 嘗試解析為標準響應
	var response models.OpenAIResponse
	if err := json.Unmarshal(responseBody, &response); err != nil {
		// 嘗試解析為通用 JSON
		var genericResponse map[string]interface{}
		if jsonErr := json.Unmarshal(responseBody, &genericResponse); jsonErr != nil {
			return AskLLMResult{}, fmt.Errorf("無法解析 API 響應: %v", err)
		}

		// 嘗試從通用 JSON 中提取答案
		var answer string
		var promptTokens, completionTokens, totalTokens int

		// 檢查是否有 choices 字段
		if choices, ok := genericResponse["choices"].([]interface{}); ok && len(choices) > 0 {
			if choice, ok := choices[0].(map[string]interface{}); ok {
				if message, ok := choice["message"].(map[string]interface{}); ok {
					if content, ok := message["content"].(string); ok {
						answer = content
					}
				}
			}
		}

		// 檢查是否有 usage 字段
		if usage, ok := genericResponse["usage"].(map[string]interface{}); ok {
			if pt, ok := usage["prompt_tokens"].(float64); ok {
				promptTokens = int(pt)
			}
			if ct, ok := usage["completion_tokens"].(float64); ok {
				completionTokens = int(ct)
			}
			if tt, ok := usage["total_tokens"].(float64); ok {
				totalTokens = int(tt)
			}
		}

		if answer != "" {
			return AskLLMResult{
				Answer:           answer,
				PromptTokens:     promptTokens,
				CompletionTokens: completionTokens,
				TotalTokens:      totalTokens,
			}, nil
		}

		return AskLLMResult{}, fmt.Errorf("無法從響應中提取答案")
	}

	// 檢查是否有回答
	if len(response.Choices) == 0 {
		return AskLLMResult{}, fmt.Errorf("API 沒有返回任何選擇")
	}

	// 返回 LLM 的回答和 token 使用量
	return AskLLMResult{
		Answer:           response.Choices[0].Message.Content,
		PromptTokens:     response.Usage.PromptTokens,
		CompletionTokens: response.Usage.CompletionTokens,
		TotalTokens:      response.Usage.TotalTokens,
	}, nil
}

// 解析 web_search 響應
func parseWebSearchResponse(responseBody []byte) (AskLLMResult, error) {
	var webSearchResponse map[string]interface{}
	if err := json.Unmarshal(responseBody, &webSearchResponse); err != nil {
		return AskLLMResult{}, fmt.Errorf("無法解析 web_search 響應: %v", err)
	}

	// 從 web_search 響應中提取答案
	var answer string
	if output, ok := webSearchResponse["output"].([]interface{}); ok && len(output) > 0 {
		for _, item := range output {
			if msg, ok := item.(map[string]interface{}); ok {
				if msgType, ok := msg["type"].(string); ok && msgType == "message" {
					if content, ok := msg["content"].([]interface{}); ok && len(content) > 0 {
						for _, contentItem := range content {
							if textObj, ok := contentItem.(map[string]interface{}); ok {
								if textType, ok := textObj["type"].(string); ok && textType == "output_text" {
									if text, ok := textObj["text"].(string); ok {
										answer = text
										break
									}
								}
							}
						}
					}
				}
			}
		}
	}

	if answer == "" {
		return AskLLMResult{}, fmt.Errorf("無法從 web_search 響應中提取答案")
	}

	// 提取 token 使用量
	var promptTokens, completionTokens, totalTokens int
	if usage, ok := webSearchResponse["usage"].(map[string]interface{}); ok {
		if pt, ok := usage["input_tokens"].(float64); ok {
			promptTokens = int(pt)
		}
		if ct, ok := usage["output_tokens"].(float64); ok {
			completionTokens = int(ct)
		}
		if tt, ok := usage["total_tokens"].(float64); ok {
			totalTokens = int(tt)
		}
	}

	return AskLLMResult{
		Answer:           answer,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TotalTokens:      totalTokens,
	}, nil
}

// GenerateResponse 生成回應
func GenerateResponse(req models.AskRequest) (models.AskResponse, error) {
	// 調用 LLM 生成回答
	result, err := AskLLM(
		req.Question,
		req.URL,
		req.Title,
		req.PageContent,
		req.Screenshot,
		req.UseWebSearch,
		req.IsSimple,
	)

	if err != nil {
		return models.AskResponse{}, fmt.Errorf("生成回答時出錯: %v", err)
	}

	// 構建回應，包括 token 使用量
	resp := models.AskResponse{
		Answer: result.Answer,
		Usage: models.TokenUsage{
			PromptTokens:     result.PromptTokens,
			CompletionTokens: result.CompletionTokens,
			TotalTokens:      result.TotalTokens,
		},
	}

	return resp, nil
}
