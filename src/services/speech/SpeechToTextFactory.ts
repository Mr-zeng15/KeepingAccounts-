import { SpeechToTextService } from './SpeechToText';
import { StubSpeechToText } from './StubSpeechToText';

export class SpeechToTextFactory {
  private static provider: SpeechToTextService | null = null;

  /**
   * 注册语音识别服务提供者
   * 在 App 启动时调用，传入具体的实现
   *
   * @example
   * // 接入百度语音
   * SpeechToTextFactory.register(new BaiduSpeechToText({ appId, apiKey, secretKey }));
   *
   * // 接入讯飞语音
   * SpeechToTextFactory.register(new IFLYSpeechToText({ appId, apiKey }));
   *
   * // 接入 Whisper
   * SpeechToTextFactory.register(new WhisperSpeechToText({ modelPath }));
   */
  static register(service: SpeechToTextService): void {
    this.provider = service;
  }

  /**
   * 获取当前注册的语音识别服务
   * 如果没有注册过，返回默认的占位实现
   */
  static get(): SpeechToTextService {
    if (!this.provider) {
      this.provider = new StubSpeechToText();
    }
    return this.provider;
  }

  /**
   * 检查是否已注册真实的语音服务（非占位）
   */
  static hasRealProvider(): boolean {
    return this.provider !== null && !(this.provider instanceof StubSpeechToText);
  }
}
