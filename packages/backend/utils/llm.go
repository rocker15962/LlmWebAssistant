package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rocker15962/llm-web-assistant/packages/backend/models"
)

// GenerateResponse 生成回應
func GenerateResponse(req models.AskRequest) (models.AskResponse, error) {
	startTime := time.Now()

	// 獲取 API 密鑰
	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		return models.AskResponse{}, fmt.Errorf("未設置 LLM_API_KEY 環境變數")
	}

	// 獲取 API 端點
	apiEndpoint := os.Getenv("LLM_API_ENDPOINT")
	if apiEndpoint == "" {
		apiEndpoint = "https://api.openai.com/v1/responses" // 默認使用 OpenAI responses API
	}

	// 獲取模型名稱
	modelName := os.Getenv("LLM_MODEL")
	if modelName == "" {
		modelName = "gpt-4o-mini" // 默認使用 GPT-4o-mini
	}

	// 構建 API 請求
	apiReq := map[string]interface{}{
		"model": modelName,
	}

	// 構建系統提示詞
	systemPrompt := "你是一個專業的網頁分析助手。"

	if req.IsSimple {
		systemPrompt += `
你應該提供簡潔明瞭的回答，控制在 100 字以內。
直接給出結論，不需要解釋過程。`
	} else {
		systemPrompt += `
你應該提供詳細且結構化的回答。
如果適合，可以使用列表、標題等格式來組織信息。
解釋你的分析過程和結論。`
	}

	systemPrompt += `
你的任務是：
1. 分析用戶提供的網頁內容和截圖
2. 回答用戶的問題，基於你從網頁中獲得的信息
3. 如果無法從提供的資料中找到答案，請誠實說明`

	// 構建輸入消息
	input := []map[string]interface{}{}

	// 添加系統消息
	input = append(input, map[string]interface{}{
		"role": "system",
		"content": []map[string]interface{}{
			{
				"type": "input_text",
				"text": systemPrompt,
			},
		},
	})

	// 構建用戶消息
	userContent := []map[string]interface{}{}

	// 添加文本內容
	userPrompt := fmt.Sprintf("我正在瀏覽網頁：%s\n\n我的問題是：%s", req.Title, req.Question)

	// 如果有頁面內容，添加到提示詞
	if req.PageContent != "" {
		userPrompt += "\n\n網頁內容摘要：\n"

		// 嘗試解析 JSON 格式的頁面內容
		var contentObj map[string]interface{}
		if err := json.Unmarshal([]byte(req.PageContent), &contentObj); err == nil {
			// 成功解析 JSON
			if headings, ok := contentObj["headings"].([]interface{}); ok && len(headings) > 0 {
				userPrompt += "標題：\n"
				for i, h := range headings {
					if i < 5 { // 限制標題數量
						userPrompt += fmt.Sprintf("- %s\n", h)
					} else {
						userPrompt += "...(更多標題)\n"
						break
					}
				}
				userPrompt += "\n"
			}

			if paragraphs, ok := contentObj["paragraphs"].([]interface{}); ok && len(paragraphs) > 0 {
				userPrompt += "內容摘要：\n"
				for i, p := range paragraphs {
					if i < 3 { // 限制段落數量
						userPrompt += fmt.Sprintf("%s\n\n", p)
					} else {
						userPrompt += "...(更多內容)\n"
						break
					}
				}
			}
		} else {
			// 無法解析 JSON，直接使用文本
			// 限制長度以避免 token 過多
			const maxContentLength = 2000
			if len(req.PageContent) > maxContentLength {
				userPrompt += req.PageContent[:maxContentLength] + "...(內容已截斷)"
			} else {
				userPrompt += req.PageContent
			}
		}
	}

	// 添加文本內容到用戶輸入
	userContent = append(userContent, map[string]interface{}{
		"type": "input_text",
		"text": userPrompt,
	})

	// 添加截圖（如果有）
	if req.Screenshot != "" {
		// 確保截圖格式正確
		if !strings.HasPrefix(req.Screenshot, "data:image/") {
			if strings.HasPrefix(req.Screenshot, "data:") {
				req.Screenshot = strings.Replace(req.Screenshot, "data:", "data:image/jpeg;base64,", 1)
			} else {
				req.Screenshot = "data:image/jpeg;base64," + req.Screenshot
			}
		}

		userContent = append(userContent, map[string]interface{}{
			"type":      "input_image",
			"image_url": req.Screenshot,
		})
	}

	// 添加用戶消息到輸入
	input = append(input, map[string]interface{}{
		"role":    "user",
		"content": userContent,
	})

	// 設置輸入
	apiReq["input"] = input

	// 設置 max_tokens 根據簡單/詳細模式
	if req.IsSimple {
		apiReq["max_output_tokens"] = 500
	} else {
		apiReq["max_output_tokens"] = 2000
	}

	// 設置溫度
	apiReq["temperature"] = 0.7

	// 如果啟用了網絡搜索，添加工具
	if req.UseWebSearch {
		LogDebug("啟用網絡搜索功能")
		apiReq["tools"] = []map[string]interface{}{
			{
				"type": "web_search_preview",
			},
		}
	}

	// 序列化請求
	reqBody, err := json.Marshal(apiReq)
	if err != nil {
		LogErrorDetails(err, "序列化 LLM API 請求失敗")
		return models.AskResponse{}, err
	}

	// 記錄完整的請求內容（用於調試）
	LogDebug("OpenAI 請求內容: %s", string(reqBody))

	// 創建 HTTP 請求
	httpReq, err := http.NewRequest("POST", apiEndpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		LogErrorDetails(err, "創建 HTTP 請求失敗")
		return models.AskResponse{}, err
	}

	// 設置請求頭
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	// 發送請求
	LogDebug("發送請求到 LLM API: %s", apiEndpoint)
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		LogErrorDetails(err, "發送 LLM API 請求失敗")
		return models.AskResponse{}, err
	}
	defer resp.Body.Close()

	// 讀取響應體
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		LogErrorDetails(err, "讀取 LLM API 響應失敗")
		return models.AskResponse{}, err
	}

	// 檢查響應狀態
	if resp.StatusCode != http.StatusOK {
		// 嘗試解析錯誤響應
		var errorResp struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
				Code    string `json:"code"`
			} `json:"error"`
		}

		if err := json.Unmarshal(respBody, &errorResp); err == nil && errorResp.Error.Message != "" {
			errorMsg := fmt.Sprintf("LLM API 錯誤: %s (類型: %s, 代碼: %s)",
				errorResp.Error.Message, errorResp.Error.Type, errorResp.Error.Code)
			LogError(errorMsg)
			LogDebug("完整錯誤響應: %s", string(respBody))
			return models.AskResponse{}, fmt.Errorf(errorMsg)
		}

		// 如果無法解析錯誤響應，則返回原始響應
		errorMsg := fmt.Sprintf("LLM API 返回狀態碼: %d, 響應: %s", resp.StatusCode, string(respBody))
		LogError(errorMsg)
		return models.AskResponse{}, fmt.Errorf("LLM API 返回狀態碼: %d", resp.StatusCode)
	}

	// 記錄完整的響應內容（用於調試）
	LogDebug("OpenAI 響應內容: %s", string(respBody))

	// 解析響應
	var responseObj map[string]interface{}
	if err := json.Unmarshal(respBody, &responseObj); err != nil {
		LogErrorDetails(err, "解析 LLM API 響應失敗")
		LogDebug("無法解析的響應內容: %s", string(respBody))
		return models.AskResponse{}, err
	}

	// 提取回答文本
	var answer string

	// 從 output 數組中查找 message 類型的內容
	if output, ok := responseObj["output"].([]interface{}); ok {
		for _, item := range output {
			if outputItem, ok := item.(map[string]interface{}); ok {
				if outputType, ok := outputItem["type"].(string); ok && outputType == "message" {
					if content, ok := outputItem["content"].([]interface{}); ok && len(content) > 0 {
						for _, contentItem := range content {
							if textItem, ok := contentItem.(map[string]interface{}); ok {
								if textType, ok := textItem["type"].(string); ok && textType == "output_text" {
									if text, ok := textItem["text"].(string); ok {
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
		LogError("無法從 LLM API 響應中提取回答")
		LogDebug("完整響應: %s", string(respBody))
		return models.AskResponse{}, fmt.Errorf("無法從 LLM API 響應中提取回答")
	}

	// 提取 token 使用量
	var promptTokens, completionTokens, totalTokens int
	if usage, ok := responseObj["usage"].(map[string]interface{}); ok {
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

	// 記錄處理時間
	processingTime := time.Since(startTime)
	LogDebug("LLM 處理完成，耗時: %v", processingTime)

	// 返回結果
	return models.AskResponse{
		Answer: answer,
		Usage: models.TokenUsage{
			PromptTokens:     promptTokens,
			CompletionTokens: completionTokens,
			TotalTokens:      totalTokens,
		},
	}, nil
}
