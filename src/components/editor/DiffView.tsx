import { useEffect, useRef } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sql, StandardSQL } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { useTheme } from "next-themes";

interface DiffViewProps {
  original: string;
  modified: string;
}

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    fontSize: "13px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid hsl(var(--border))",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

const darkBaseTheme = EditorView.theme({
  "&": {
    fontSize: "13px",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

export function DiffView({ original, modified }: DiffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (mergeViewRef.current) {
      mergeViewRef.current.destroy();
    }

    const sqlExtension = sql({ dialect: StandardSQL, upperCaseKeywords: true });
    const themeExtensions = isDark
      ? [oneDark, darkBaseTheme]
      : [syntaxHighlighting(defaultHighlightStyle), lightTheme];

    const sharedExtensions = [
      sqlExtension,
      EditorView.lineWrapping,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      ...themeExtensions,
    ];

    const view = new MergeView({
      parent: containerRef.current,
      a: {
        doc: original,
        extensions: sharedExtensions,
      },
      b: {
        doc: modified,
        extensions: sharedExtensions,
      },
      collapseUnchanged: {},
    });

    mergeViewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [original, modified, isDark]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-4">
        <div className="flex-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Original
          </span>
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Refined
          </span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-border [&_.cm-mergeView]:h-full [&_.cm-mergeView]:gap-0 [&_.cm-mergeViewEditor]:flex-1 [&_.cm-mergeViewEditor]:min-w-0"
      />
    </div>
  );
}
