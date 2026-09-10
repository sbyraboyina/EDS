import { React, createRoot, flushSync } from "@kui/foundations-react";
import { TextArea } from "@kui/foundations-react";
import { renderText } from "../text/text.js";

const h = React.createElement;
const { useId, useState } = React;

const KINDS = ["flat", "floating"];
const SIZES = ["small", "medium", "large"];
const LAYOUTS = ["horizontal", "vertical"];
const RESIZE = ["auto", "manual"];
const TOKENS = new Set([...KINDS, ...SIZES, ...LAYOUTS, ...RESIZE, "disabled"]);

function dataOption(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// Trailing separators are a common leftover when an author splits a run-on
// line ("Message ·") — drop them so they never reach the rendered field.
function clean(value) {
  return (value || "").replace(/^[\s·•|]+|[\s·•|]+$/g, "");
}

function text(el) {
  return clean(el?.textContent) || undefined;
}

// Cell text with any "[auto, large]" option group removed.
function cellText(cell) {
  const value = text(cell);
  const found = parseOptions(value);
  return (found ? clean(value.replace(found.match, "")) : value) || undefined;
}

function parseRows(value) {
  const rows = Number.parseInt(value, 10);
  return Number.isFinite(rows) && rows > 0 ? rows : undefined;
}

// Options like "[auto, large]" authored in any paragraph, or in the block name
// cell — "text-area (auto, large)" — which the pipeline turns into classes.
function parseOptions(str) {
  const match = (str || "").match(/[[(]\s*([^\])]+?)\s*[\])]/);
  if (!match) return null;
  const tokens = match[1]
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length && tokens.every((t) => TOKENS.has(t))) {
    return { match: match[0], tokens };
  }
  return null;
}

// Paragraphs carry the placeholder and the default value. Either author them in
// order, or name them explicitly with a "Placeholder:" / "Value:" prefix.
function collectParagraphs(scope) {
  const tokens = [];
  const body = [];
  const named = {};

  [...scope.querySelectorAll("p")].forEach((p) => {
    let value = text(p);
    if (!value) return;

    const found = parseOptions(value);
    if (found) {
      tokens.push(...found.tokens);
      value = clean(value.replace(found.match, ""));
    }
    if (!value) return;

    const labelled = value.match(/^(placeholder|value|default value)\s*:\s*(.*)$/i);
    if (labelled) {
      named[/^placeholder$/i.test(labelled[1]) ? "placeholder" : "value"] = labelled[2].trim();
      return;
    }
    body.push(value);
  });

  return { body, named, tokens };
}

// One field per row, same as cards. Fields are set with the Google Docs
// paragraph-style menu:
//   Heading 3    -> label
//   Heading 4    -> help text under the field, or the placeholder when no
//                   Normal text paragraph is authored
//   Normal text  -> placeholder, then the default value
//   "[...]" line -> options: auto|manual, small|medium|large, flat|floating,
//                   horizontal|vertical, disabled
// With no heading styles at all, the values are read in order — either across
// the cells [label] | [placeholder] | [value], or line by line down a single
// cell, whichever the author used.
function readField(block, row) {
  const cells = [...row.children];
  const heading = row.querySelector("h1, h2, h3");
  const { body, named, tokens } = collectParagraphs(row);
  const styled = Boolean(heading || row.querySelector("h4"));
  const lines = !styled && cells.length === 1 ? body : null;

  const opt = [...tokens, ...block.classList].map((t) => t.toLowerCase());
  const attr = (key) => row.dataset[key] || block.dataset[key];
  const pick = (allowed, key, fallback) =>
    opt.find((t) => allowed.includes(t)) || dataOption(attr(key), allowed, fallback);

  const helpText = text(row.querySelector("h4"));
  let label;
  let placeholder;
  let value;

  if (styled) {
    [label, placeholder, value] = [text(heading), body[0], body[1]];
  } else if (lines) {
    [label, placeholder, value] = lines;
  } else {
    [label, placeholder, value] = cells.map(cellText);
  }

  placeholder = named.placeholder || placeholder;
  value = named.value || value;

  return {
    disabled: opt.includes("disabled") || attr("disabled") === "true",
    help: placeholder ? helpText : undefined,
    kind: pick(KINDS, "textareaKind", "flat"),
    label: label || "",
    layout: pick(LAYOUTS, "textareaLayout", "horizontal"),
    name: attr("name") || "",
    placeholder: placeholder || helpText || "",
    resizeable: pick(RESIZE, "resizeable", "auto"),
    rows: parseRows(attr("rows")),
    size: pick(SIZES, "textareaSize", "medium"),
    value: value || "",
  };
}

function TextAreaField({
  disabled,
  help,
  kind,
  label,
  layout,
  name,
  placeholder,
  resizeable,
  rows,
  size,
  value: initialValue,
}) {
  const [value, setValue] = useState(initialValue);
  const fieldId = useId();

  return h(
    "div",
    { className: "text-area-field" },
    label && h("label", { className: "text-area-label", htmlFor: fieldId }, label),
    h(TextArea, {
      "aria-label": label || undefined,
      disabled,
      id: fieldId,
      kind,
      layout,
      name: name || undefined,
      onValueChange: setValue,
      placeholder,
      resizeable,
      rows,
      size,
      value,
    }),
    renderText(help, { className: "text-area-help", kind: "label/regular/sm", tag: "p" }),
  );
}

export default function decorate(block) {
  const fields = [...block.children].map((row) => readField(block, row));

  block.classList.add("nv-theme-kui11");

  flushSync(() => {
    createRoot(block).render(
      h(
        "div",
        { className: "text-area-fields" },
        fields.map((field, i) => h(TextAreaField, { key: i, ...field })),
      ),
    );
  });
}
