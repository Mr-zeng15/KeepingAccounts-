import React, { createContext, useContext, useState, useCallback } from 'react';
import ThemedAlert from './ThemedAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOpts {
  title: string;
  message: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  confirm?: () => void;
  cancel?: () => void;
  singleButton?: boolean;
  buttons?: AlertButton[];
}

let globalShow: ((opts: AlertOpts) => void) | null = null;

/**
 * 在任何地方（不需要 React 组件上下文）调用这个函数显示主题弹窗
 * 支持两种调用方式：
 * 1. showThemedAlert('标题', '内容', confirmCallback, icon?)
 * 2. showThemedAlert('标题', '内容', [{ text: '按钮1', onPress: ... }, ...], icon?)
 */
export function showThemedAlert(title: string, message: string, confirmOrButtons?: (() => void) | AlertButton[], icon?: string) {
  if (globalShow) {
    if (Array.isArray(confirmOrButtons)) {
      // 传入的是按钮数组
      globalShow({ title, message, buttons: confirmOrButtons, singleButton: false, icon });
    } else {
      // 传入的是确认回调
      globalShow({ title, message, confirm: confirmOrButtons, singleButton: true, icon });
    }
  }
}

export function showThemedConfirm(title: string, message: string, confirm: () => void, confirmText?: string) {
  if (globalShow) {
    globalShow({ title, message, confirm, confirmText, cancelText: '取消' });
  }
}

const AlertContext = createContext<{
  show: (o: any) => void;
}>({ show: () => {} });

export function useThemedAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<any>(null);

  const show = useCallback((opts: any) => {
    // 如果传入了buttons数组，为每个按钮添加关闭弹窗的逻辑
    if (opts.buttons) {
      const processedButtons = opts.buttons.map((btn: any) => ({
        ...btn,
        onPress: () => {
          btn.onPress?.();
          setState(null);
        },
      }));
      setState({ ...opts, buttons: processedButtons });
    } else {
      setState({
        ...opts,
        onConfirm: () => {
          opts.confirm?.();
          setState(null);
        },
        onCancel: opts.cancel ? () => {
          opts.cancel?.();
          setState(null);
        } : (opts.singleButton ? undefined : () => setState(null)),
      });
    }
  }, []);

  // 注册全局方法
  globalShow = show;

  return (
    <AlertContext.Provider value={{ show }}>
      {children}
      {state && (
        <ThemedAlert
          visible={true}
          title={state.title}
          message={state.message}
          icon={state.icon}
          confirmText={state.confirmText || '确定'}
          cancelText={state.cancelText || '取消'}
          singleButton={state.singleButton}
          onConfirm={state.onConfirm}
          onCancel={state.onCancel}
          buttons={state.buttons}
        />
      )}
    </AlertContext.Provider>
  );
}
