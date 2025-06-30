type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
    private events: Record<string, EventHandler[]> = {};

    /**
     * 订阅事件
     * @param eventName 事件名称
     * @param handler 事件处理函数
     */
    on<T = any>(eventName: string, handler: EventHandler<T>): void {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(handler);
    }

    /**
     * 取消订阅事件
     * @param eventName 事件名称
     * @param handler 要移除的事件处理函数
     */
    off<T = any>(eventName: string, handler?: EventHandler<T>): void {
        if (!this.events[eventName]) return;

        if (handler) {
            // 移除特定的处理函数
            this.events[eventName] = this.events[eventName].filter(h => h !== handler);
        } else {
            // 移除该事件的所有处理函数
            delete this.events[eventName];
        }
    }

    /**
     * 发布事件
     * @param eventName 事件名称
     * @param payload 事件负载数据
     */
    emit<T = any>(eventName: string, payload?: T): void {
        if (!this.events[eventName]) return;

        this.events[eventName].forEach(handler => {
            try {
                handler(payload);
            } catch (error) {
                console.error(`Error executing handler for event "${eventName}":`, error);
            }
        });
    }

    /**
     * 一次性订阅事件
     * @param eventName 事件名称
     * @param handler 事件处理函数
     */
    once<T = any>(eventName: string, handler: EventHandler<T>): void {
        const onceHandler: EventHandler<T> = (payload) => {
            handler(payload);
            this.off(eventName, onceHandler);
        };
        this.on(eventName, onceHandler);
    }
}