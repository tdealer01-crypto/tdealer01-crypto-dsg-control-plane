// Allow CSS side-effect imports (e.g. import './globals.css') in TypeScript
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
