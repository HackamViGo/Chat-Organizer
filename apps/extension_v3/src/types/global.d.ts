export {};

declare global {
  interface Window {
    BrainBoxUI: any;
    BrainBoxMaster: any;
    BrainBoxPromptInject: any;
    BRAINBOX_PROMPT_INJECT_LOADED: boolean;
    __INITIAL_STATE__: any;
  }
}
