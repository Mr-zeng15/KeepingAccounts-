import { SpeechToTextService, SpeechToTextResult } from './SpeechToText';

/**
 * 占位实现 - 用于开发测试
 * 后续替换为真实服务（百度/讯飞/Whisper等）
 */
export class StubSpeechToText implements SpeechToTextService {
  private listening = false;

  async initialize(): Promise<void> {
    console.log('[StubSpeechToText] 初始化完成（占位实现）');
  }

  async startListening(): Promise<void> {
    this.listening = true;
    console.log('[StubSpeechToText] 开始录音...');
  }

  async stopListening(): Promise<SpeechToTextResult> {
    this.listening = false;
    console.log('[StubSpeechToText] 停止录音');
    // 返回一个模拟结果
    return {
      text: '午饭花了35块',
      confidence: 0.95,
      rawResponse: { provider: 'stub' },
    };
  }

  isListening(): boolean {
    return this.listening;
  }

  async destroy(): Promise<void> {
    this.listening = false;
    console.log('[StubSpeechToText] 资源已释放');
  }
}
