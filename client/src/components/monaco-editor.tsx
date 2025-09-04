import type React from 'react';
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

let monacoLoaderPromise: Promise<any> | null = null;

function MonacoEditorInner(
  {
    value,
    language,
    onChange,
    theme = 'vs-dark',
    height = '400px',
    options = {}
  }: MonacoEditorProps,
  ref: React.Ref<MonacoEditorRef>
) {
  const getMonacoLanguageId = (lang: string) => {
    switch (lang) {
      case 'python3':
        return 'python';
      case 'c':
        return 'cpp';
      default:
        return lang;
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (newValue: string) => editorRef.current?.setValue(newValue),
    focus: () => editorRef.current?.focus()
  }));

  useEffect(() => {
    // Load Monaco using a cached singleton promise to avoid repeated network fetches
    const load = (): Promise<any> => {
      if (monacoLoaderPromise) return monacoLoaderPromise;
      monacoLoaderPromise = new Promise((resolve) => {
        if (typeof window !== 'undefined' && (window as any).require) {
          (window as any).require.config({
            paths: {
              vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs'
            }
          });
          (window as any).require(['vs/editor/editor.main'], (monaco: any) => resolve(monaco));
        }
      });
      return monacoLoaderPromise;
    };

    load().then((monaco: any) => {
        if (containerRef.current && !editorRef.current) {
          monacoRef.current = monaco;
          
          // Configure language features
          monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
          monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
          
          // Ensure languages are registered with comment configuration
          const ensureLanguage = (id: string, config: any, comments: { lineComment: string; blockComment?: [string, string] }) => {
            if (!monaco.languages.getEncodedLanguageId(id)) {
              monaco.languages.register({ id });
            }
            monaco.languages.setLanguageConfiguration(id, { comments });
            monaco.languages.setMonarchTokensProvider(id, config);
          };

          // Add support for additional languages
          if (language === 'python' || language === 'python3') {
            // Python support
            ensureLanguage('python', {
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
            }, { lineComment: '#' });
            // Basic Python snippets and builtins
            monaco.languages.registerCompletionItemProvider('python', {
              triggerCharacters: ['.', '(', '[', ' ', '\\n'],
              provideCompletionItems: () => ({
                suggestions: [
                  { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:i} in range(${2:n}):\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                  { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:name}(${2:args}):\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                  { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:cond}:\n    ${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                  { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:args})' },
                  { label: 'input', kind: monaco.languages.CompletionItemKind.Function, insertText: 'input(${1:prompt})' },
                  { label: 'int', kind: monaco.languages.CompletionItemKind.Function, insertText: 'int(${1:value})' },
                  { label: 'float', kind: monaco.languages.CompletionItemKind.Function, insertText: 'float(${1:value})' },
                  { label: 'str', kind: monaco.languages.CompletionItemKind.Function, insertText: 'str(${1:value})' },
                  { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:iterable})' },
                  { label: 'list', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'list' },
                  { label: 'dict', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'dict' },
                  { label: 'set', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'set' },
                ]
              })
            });
          } else if (language === 'java') {
            // Java support
            ensureLanguage('java', {
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
            }, { lineComment: '//', blockComment: ['/*', '*/'] });
            monaco.languages.registerCompletionItemProvider('java', {
              provideCompletionItems: () => ({
                suggestions: [
                  { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'public static void main(String[] args) {\n    ${1}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                  { label: 'sysout', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'System.out.println(${1});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                ]
              })
            });
          } else if (language === 'cpp' || language === 'c') {
            // C++/C support
            ensureLanguage('cpp', {
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
            }, { lineComment: '//', blockComment: ['/*', '*/'] });
            monaco.languages.registerCompletionItemProvider('cpp', {
              provideCompletionItems: () => ({
                suggestions: [
                  { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n    ${1}\n    return 0;\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                  { label: 'printf', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'printf("%s\\n", ${1});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                ]
              })
            });
          } else if (language === 'csharp') {
            // C# support
            ensureLanguage('csharp', {
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
            }, { lineComment: '//', blockComment: ['/*', '*/'] });
            monaco.languages.registerCompletionItemProvider('csharp', {
              provideCompletionItems: () => ({
                suggestions: [
                  { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'static void Main(string[] args) {\n    ${1}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                  { label: 'cw', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'Console.WriteLine(${1});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                ]
              })
            });
          }

          // Create editor
          const langId = getMonacoLanguageId(language);
          editorRef.current = monaco.editor.create(containerRef.current, {
            value,
            language: langId,
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
            // Clear markers for non-TS/JS languages to avoid stray squiggles
            const currentLang = editorRef.current.getModel()?.getLanguageId();
            if (currentLang && currentLang !== 'javascript' && currentLang !== 'typescript') {
              monaco.editor.setModelMarkers(editorRef.current.getModel(), 'owner', []);
            }
          });
        }
      });

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
        monacoRef.current.editor.setModelLanguage(model, getMonacoLanguageId(language));
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
}

const MonacoEditor = forwardRef(MonacoEditorInner) as React.ForwardRefExoticComponent<MonacoEditorProps & React.RefAttributes<MonacoEditorRef>>;

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
