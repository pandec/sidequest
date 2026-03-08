import { useCallback, useMemo } from "react";
import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { sql, StandardSQL } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { useTheme } from "next-themes";

interface SqlEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
}

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid hsl(var(--border))",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(var(--accent))",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--accent) / 0.5)",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

const darkBaseTheme = EditorView.theme({
  "&.cm-focused": {
    outline: "none",
  },
});

export function SqlEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Paste your BigQuery SQL here...",
  height = "300px",
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleChange = useCallback(
    (val: string) => {
      onChange?.(val);
    },
    [onChange],
  );

  const extensions = useMemo(
    () => [
      sql({ dialect: StandardSQL, upperCaseKeywords: true }),
      EditorView.lineWrapping,
    ],
    [],
  );

  const theme = useMemo<ReactCodeMirrorProps["theme"]>(() => {
    if (isDark) return [oneDark, darkBaseTheme];
    return [lightTheme];
  }, [isDark]);

  const isFill = height === "100%";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-border ${isFill ? "" : "resize-y"}`}
      style={{
        minHeight: isFill ? undefined : height,
        height: isFill ? "100%" : undefined,
      }}
    >
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        theme={theme}
        height="100%"
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
        }}
      />
    </div>
  );
}
