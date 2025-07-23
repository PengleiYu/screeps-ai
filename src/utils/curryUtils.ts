type CurryV2<T extends any[], R> = T extends [infer H, ...infer Rest]
    ? Rest extends []
        ? (arg: H) => R
        : (arg: H) => CurryV2<Rest, R>
    : never;

type CurriedFunction<T> = T extends (...args: infer P) => infer R
    ? CurryV2<P, R>
    : never;

export function curry<T extends (...args: any[]) => any>(fn: T): CurriedFunction<T> {
    const curried = (...args: any[]): any => {
        if (args.length >= fn.length) {
            return fn(...args);
        }
        return (...nextArgs: any[]) => curried(...args, ...nextArgs);
    };
    return curried as CurriedFunction<T>;
}