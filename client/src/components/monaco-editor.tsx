import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  theme?: 'vs' | 'vs-dark' | 'hc-black';
  height?: string;
  options?: any;
}

export interface MonacoEditorRef {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
}

const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(({
  value,
  language,
  onChange,
  theme = 'vs-dark',
  height = '400px',
  options = {}
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (newValue: string) => editorRef.current?.setValue(newValue),
    focus: () => editorRef.current?.focus()
  }));

  useEffect(() => {
    // Check if Monaco is available
    if (typeof window !== 'undefined' && (window as any).require) {
      (window as any).require.config({ 
        paths: { 
          vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' 
        } 
      });

      (window as any).require(['vs/editor/editor.main'], (monaco: any) => {
        if (containerRef.current && !editorRef.current) {
          monacoRef.current = monaco;
          
          // Configure language features
          monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
          monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
          
          // Add support for additional languages
          if (language === 'python' || language === 'python3') {
            // Python support
            monaco.languages.setMonarchTokensProvider('python', {
              tokenizer: {
                root: [
                  [/[a-zA-Z_]\w*/, 'identifier'],
                  [/".*?"/, 'string'],
                  [/'.*?'/, 'string'],
                  [/#.*$/, 'comment'],
                  [/\b(def|class|if|else|elif|for|while|try|except|finally|with|import|from|as|return|yield|break|continue|pass|raise|assert|lambda|True|False|None)\b/, 'keyword'],
                  [/\b(int|float|str|bool|list|tuple|dict|set)\b/, 'type'],
                ]
              }
            });
          } else if (language === 'java') {
            // Java support
            monaco.languages.setMonarchTokensProvider('java', {
              tokenizer: {
                root: [
                  [/[a-zA-Z_]\w*/, 'identifier'],
                  [/".*?"/, 'string'],
                  [/'.*?'/, 'string'],
                  [/\/\/.*$/, 'comment'],
                  [/\/\*[\s\S]*?\*\//, 'comment'],
                  [/\b(public|private|protected|static|final|abstract|class|interface|extends|implements|new|this|super|if|else|for|while|do|switch|case|default|try|catch|finally|throw|throws|return|void|int|long|float|double|boolean|char|String|Object)\b/, 'keyword'],
                ]
              }
            });
          } else if (language === 'cpp' || language === 'c') {
            // C++/C support
            monaco.languages.setMonarchTokensProvider('cpp', {
              tokenizer: {
                root: [
                  [/[a-zA-Z_]\w*/, 'identifier'],
                  [/".*?"/, 'string'],
                  [/'.*?'/, 'string'],
                  [/\/\/.*$/, 'comment'],
                  [/\/\*[\s\S]*?\*\//, 'comment'],
                  [/\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|class|namespace|public|private|protected|template|typename|virtual|inline|explicit|friend|operator|new|delete|this|true|false|nullptr)\b/, 'keyword'],
                ]
              }
            });
          } else if (language === 'csharp') {
            // C# support
            monaco.languages.setMonarchTokensProvider('csharp', {
              tokenizer: {
                root: [
                  [/[a-zA-Z_]\w*/, 'identifier'],
                  [/".*?"/, 'string'],
                  [/'.*?'/, 'string'],
                  [/\/\/.*$/, 'comment'],
                  [/\/\*[\s\S]*?\*\//, 'comment'],
                  [/\b(abstract|as|base|bool|break|case|catch|char|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while)\b/, 'keyword'],
                ]
              }
            });
          }

          // Create editor
          editorRef.current = monaco.editor.create(containerRef.current, {
            value,
            language,
            theme,
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Monaco, Cascadia Code, Fira Code, monospace',
            lineHeight: 1.5,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            ...options
          });

          // Handle value changes
          editorRef.current.onDidChangeModelContent(() => {
            const currentValue = editorRef.current.getValue();
            onChange(currentValue);
          });
        }
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  // Update value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update language when prop changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  // Update theme when prop changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme]);

  return (
    <div 
      ref={containerRef} 
      style={{ height }}
      className="monaco-editor-container border border-slate-300 rounded-lg overflow-hidden bg-slate-900"
      data-testid="monaco-editor"
    />
  );
});

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
