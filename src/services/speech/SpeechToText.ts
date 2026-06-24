export interface SpeechToTextResult {
  text: string;
  confidence: number;       // 0-1
  rawResponse?: unknown;    // 原始响应，调试用
}

export interface SpeechToTextService {
  /** 初始化（加载模型/检查权限） */
  initialize(): Promise<void>;
  /** 开始录音识别 */
  startListening(): Promise<void>;
  /** 停止录音，返回识别结果 */
  stopListening(): Promise<SpeechToTextResult>;
  /** 是否正在录音 */
  isListening(): boolean;
  /** 释放资源 */
  destroy(): Promise<void>;
}
