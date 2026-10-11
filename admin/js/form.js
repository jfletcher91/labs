// Schema-driven form builder. Fields edit `obj` in place and call onChange() after every edit.
import { h, icon } from "./ui.js";

let uid = 0;
const nextId = () => `f${++uid}`;

export function renderFields(fields, obj, onChange) {
  return fields.map((f) => renderField(f, obj, onChange));
}

function renderField(f, obj, onChange) {
  const id = nextId();
  const label = h("label", { for: id }, f.label);
  const hint = f.hint ? h("p.hint", f.hint) : null;
  const set = (v) => {
    obj[f.key] = v;
    onChange();
  };
  const val = obj[f.key];

  switch (f.type) {
    case "textarea":
      return h("div.field", label, h("textarea", { id, rows: f.rows || 3, value: val ?? "", maxlength: f.max, oninput: (e) => set(e.target.value) }), hint);
    case "number":
      return h("div.field", label, h("input", { id, type: "number", step: "any", value: val ?? 0, oninput: (e) => set(e.target.value === "" ? 0 : Number(e.target.value)) }), hint);
    case "checkbox":
      return h("div.field.field-check", h("label.check", { for: id }, h("input", { id, type: "checkbox", checked: !!val, onchange: (e) => set(e.target.checked) }), f.label), hint);
    case "select":
      return h(
        "div.field",
        label,
        h("select", { id, onchange: (e) => set(e.target.value) }, f.options.map((o) => {
          const [value, text] = Array.isArray(o) ? o : [o, o];
          return h("option", { value, selected: value === val ? "" : undefined }, text);
        })),
        hint
      );
    case "tags":
      return h("div.field", label, h("input", {
        id, type: "text", value: (val || []).join(", "), placeholder: "Comma separated",
        oninput: (e) => set(e.target.value.split(",").map((t) => t.trim()).filter(Boolean)),
      }), hint);
    case "lines":
      return h("div.field", label, h("textarea", {
        id, rows: Math.max(3, (val || []).length + 1), value: (val || []).join("\n"),
        oninput: (e) => set(e.target.value.split("\n").map((t) => t.trim()).filter(Boolean)),
      }), h("p.hint", f.hint || "One per line"));
    case "list":
      return renderList(f, obj, onChange, label);
    default:
      return h("div.field", label, h("input", {
        id, type: f.type === "url" ? "url" : f.type === "email" ? "email" : "text",
        value: val ?? "", placeholder: f.placeholder, maxlength: f.max, spellcheck: f.type === "url" ? "false" : undefined,
        oninput: (e) => set(e.target.value),
      }), hint);
  }
}

function renderList(f, obj, onChange, label) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const list = obj[f.key];
  const wrap = h("div.list-items");
  let add;

  const draw = () => {
    if (add) add.disabled = !!(f.max && list.length >= f.max);
    wrap.replaceChildren(
      ...list.map((item, i) => {
        const title = h("span.list-title", f.itemTitle?.(item) || `${f.itemLabel || "Item"} ${i + 1}`);
        const body = h("div.list-body", renderFields(f.fields, item, () => {
          title.textContent = f.itemTitle?.(item) || `${f.itemLabel || "Item"} ${i + 1}`;
          onChange();
        }));
        const move = (d) => (e) => {
          e.preventDefault();
          const j = i + d;
          if (j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          draw();
          onChange();
        };
        return h(
          "details.list-item",
          h(
            "summary",
            title,
            h("span.list-tools",
              h("button.icon-btn", { type: "button", "aria-label": "Move up", title: "Move up", disabled: i === 0, onclick: move(-1) }, icon("up")),
              h("button.icon-btn", { type: "button", "aria-label": "Move down", title: "Move down", disabled: i === list.length - 1, onclick: move(1) }, icon("down")),
              h("button.icon-btn.danger", {
                type: "button", "aria-label": "Remove", title: "Remove", disabled: list.length <= (f.min || 0),
                onclick: (e) => {
                  e.preventDefault();
                  list.splice(i, 1);
                  draw();
                  onChange();
                },
              }, icon("trash"))
            )
          ),
          body
        );
      })
    );
  };
  add = h("button.btn.btn-ghost.btn-sm", {
    type: "button",
    onclick: () => {
      list.push(structuredClone(f.newItem));
      draw();
      wrap.lastElementChild?.setAttribute("open", "");
      wrap.lastElementChild?.querySelector("input, textarea")?.focus();
      onChange();
    },
  }, icon("plus"), `Add ${(f.itemLabel || "item").toLowerCase()}`);
  draw();

  return h("div.field.field-list", h("div.list-head", label, add), f.hint ? h("p.hint", f.hint) : null, wrap);
}
