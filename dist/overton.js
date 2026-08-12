#!/usr/bin/env bun
// @bun
var __defProp = Object.defineProperty;
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __require = import.meta.require;

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS((exports) => {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/visit.js
var require_visit = __commonJS((exports) => {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = visit_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path) {
    if (typeof visitor === "function")
      return visitor(key, node, path);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path);
    return;
  }
  function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1;; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS((exports) => {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length;i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver(reviver, val, String(i), v0);
          if (v1 === undefined)
            delete val[i];
          else if (v1 !== v0)
            val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            val.delete(k);
          else if (v1 !== v0)
            val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            delete val[k];
          else if (v1 !== v0)
            val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS((exports) => {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res2) => {
        data.res = res2;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS((exports) => {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS((exports) => {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const { anchors: anchors2, doc, maxAliasCount } = ctx;
      const source = this.resolve(doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      let data = anchors2.get(source);
      if (!data) {
        toJS.toJS(source, null, ctx);
        data = anchors2.get(source);
      }
      if (data?.res === undefined) {
        const msg = "This should not happen: Alias anchor was not resolved?";
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc, source, anchors2);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
      return data.res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors2) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors2 && source && anchors2.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors2);
        if (c > count)
          count = c;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors2);
      const vc = getAliasCount(doc, node.value, anchors2);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node2 = new Scalar.Scalar(value);
        if (ref)
          ref.node = node2;
        return node2;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS((exports) => {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1;i >= 0; --i) {
      const k = path[i];
      if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = new Map([[k, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path, value) {
      if (isEmptyPath(path))
        this.add(value);
      else {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path, keepScalar) {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n = node.value;
        return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    hasIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path, value) {
      const [key, ...rest] = path;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS((exports) => {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS((exports) => {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1)
        end = i + endStep;
    }
    for (let ch;ch = text[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i;
        switch (text[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i += 1];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i2 = 0;i2 < folds.length; ++i2) {
      const fold = folds[i2];
      const end2 = folds[i2 + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end2)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end2)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== `
`);
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i = 0, start = 0;i < strLen; ++i) {
      if (str[i] === `
`) {
        if (i - start > limit)
          return true;
        start = i + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i = 0, ch = json[i];ch; ch = json[++i]) {
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
        str += json.slice(start, i) + "\\ ";
        i += 1;
        start = i;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              const code = json.substr(i + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
              i += 1;
            } else {
              str += json.slice(start, i) + `

`;
              while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                str += `
`;
                i += 2;
              }
              str += indent;
              if (json[i + 2] === " ")
                str += "\\";
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t);
      if (res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS((exports) => {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/log.js
var require_log = __commonJS((exports) => {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
      for (const it of source.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(source))
      for (const it of source)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, source);
  }
  function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value2] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value2);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value: value2,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS((exports) => {
  var log = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify2(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment2 = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment2 = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
      if (comment2)
        str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
      if (chompKeep && comment2)
        chompKeep = false;
      lines.push(blockItemPrefix + str2);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1;i < lines.length; ++i) {
        const line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS((exports) => {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1)
          this.items.push(_pair);
        else
          this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map2, onError) {
      if (!identity.isMap(map2))
        onError("Expected a mapping for this tag");
      return map2;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq2, onError) {
      if (!identity.isSeq(seq2))
        onError("Expected a sequence for this tag");
      return seq2;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS((exports) => {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS((exports) => {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
      let i = n.indexOf(".");
      if (i < 0) {
        i = n.length;
        n += ".";
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0)
        n += "0";
    }
    return n;
  }
  exports.stringifyNumber = stringifyNumber;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS((exports) => {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i = 0;i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i = 0;i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0;i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
      for (let i = 0;i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs2 = new YAMLSeq.YAMLSeq(schema);
    pairs2.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs2.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs2;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS((exports) => {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap2 = new this;
      omap2.items = pairs$1.items;
      return omap2;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError) {
      const pairs$1 = pairs.resolvePairs(seq, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n2 = BigInt(str);
      return sign === "-" ? BigInt(-1) * n2 : n2;
    }
    const n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set2 = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set2.items.push(Pair.createPair(value, null, ctx));
        }
      return set2;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags2, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags2.includes(tagObj))
        tags2.push(tagObj);
      return tags2;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS((exports) => {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS((exports) => {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path) {
      if (Collection.isEmptyPath(path)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path, keepScalar) {
      if (Collection.isEmptyPath(path))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path) {
      if (Collection.isEmptyPath(path))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path, value) {
      if (Collection.isEmptyPath(path)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/errors.js
var require_errors = __commonJS((exports) => {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "\u2026" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "\u2026";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `\u2026
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS((exports) => {
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS((exports) => {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS((exports) => {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS((exports) => {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS((exports) => {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS((exports) => {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS((exports) => {
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0;i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i < fc.items.length - 1)
            onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key))
          onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1;i >= 0; --i) {
      const content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      const value2 = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end2 = start + header.length;
      if (scalar.source)
        end2 += scalar.source.length;
      return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0;i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1;i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent)
        chompStart = i + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i = 0;i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart;i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart;i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header") {
      onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n)
          indent = n;
        else if (error === -1)
          error = offset + i;
      }
    }
    if (error !== -1)
      onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i = 1;i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
    const lines = [line0];
    for (let i = 1;i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return foldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return foldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function foldLines(source) {
    let first, line;
    try {
      first = new RegExp(`(.*?)(?<![ 	])[ 	]*\r?
`, "sy");
      line = new RegExp(`[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`, "sy");
    } catch {
      first = /(.*?)[ \t]*\r?\n/sy;
      line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
    }
    let match = first.exec(source);
    if (!match)
      return source;
    let res = match[1];
    let sep = " ";
    let pos = first.lastIndex;
    line.lastIndex = pos;
    while (match = line.exec(source)) {
      if (match[1] === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + match[1];
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1;i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === "\r" && source[i + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === "\\") {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "\r" && source[i + 1] === `
`) {
          next = source[++i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = next === "x" ? 2 : next === "u" ? 4 : 8;
          res += parseCharCode(source, i + 1, length, onError);
          i += length;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i;
        let next = source[i + 1];
        while (next === " " || next === "\t")
          next = source[++i + 1];
        if (next !== `
` && !(next === "\r" && source[i + 2] === `
`))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "\x85",
    _: "\xA0",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code);
    } catch {
      const raw = source.substr(offset - 2, length + 2);
      onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS((exports) => {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1;i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS((exports) => {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS((exports) => {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0;i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i + 1]?.[0] !== "#")
            i += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i = 0;i < this.errors.length; ++i)
          doc.errors.push(this.errors[i]);
        for (let i = 0;i < this.warnings.length; ++i)
          doc.warnings.push(this.warnings[i]);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS((exports) => {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError)
          onError(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS((exports) => {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS((exports) => {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
  }
  exports.visit = visit;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS((exports) => {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS((exports) => {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i + 1] === `
`;
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ",") {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === "\\")
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i2 = this.pos;ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      ch = this.buffer[i];
      while (ch === " ")
        ch = this.buffer[++i];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i2 = nl - 1;
          let ch2 = this.buffer[i2];
          if (ch2 === "\r")
            ch2 = this.buffer[--i2];
          const lastChar = i2;
          while (ch2 === " ")
            ch2 = this.buffer[--i2];
          if (ch2 === `
` && i2 >= this.pos && i2 + 1 + indent > lastChar)
            nl = i2;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i]) {
        if (ch === ":") {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i += 1;
              ch = `
`;
              next = this.buffer[i + 1];
            } else
              end = i;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      let n = 0;
      loop:
        while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            case "?":
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
      return n;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
            ch = this.buffer[i += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === " " || allowTabs && ch === "\t");
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch))
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  exports.Lexer = Lexer;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS((exports) => {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS((exports) => {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i = 0;i < list.length; ++i)
      if (list[i].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0;i < list.length; ++i) {
      switch (list[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop:
      while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i]?.type === "space") {}
    return prev.splice(i, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i = 0;i < source.length; ++i)
        target.push(source[i]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              arrayPushArray(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            arrayPushArray(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last = token.items[token.items.length - 1];
          if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last.start;
            else
              top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i = 0;i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start2 = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start2 = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs);
            } else {
              Object.assign(it, { key: fs, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs, sep: [] });
            else if (it.sep)
              this.stack.push(fs);
            else
              Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS((exports) => {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter2)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter2) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter2));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// packages/core/src/types.ts
var INTERACTIVE = "@interactive";
var GATED_WINDOWS = ["five_hour", "seven_day"];
// packages/core/src/time.ts
var MINUTE = 60;
var HOUR = 3600;
var DAY = 86400;
var WEEK = 604800;
var FIVE_HOURS = 5 * HOUR;
var systemClock = () => Math.floor(Date.now() / 1000);
function toEpoch(value) {
  if (value == null)
    return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      return null;
    return value > 100000000000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && value.trim() !== "")
      return toEpoch(n);
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  }
  return null;
}
function elapsedFraction(resetsAt, windowSec, now) {
  if (!Number.isFinite(resetsAt) || windowSec <= 0)
    return 0;
  const remaining = resetsAt - now;
  return Math.max(0, Math.min(1, (windowSec - remaining) / windowSec));
}
function humanDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < MINUTE)
    return `${s}s`;
  const mins = Math.round(s / MINUTE);
  if (mins < 60)
    return `${mins}m`;
  if (mins < 1440) {
    const h2 = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h2}h${m}m` : `${h2}h`;
  }
  const hours = Math.round(mins / 60);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d${h}h` : `${d}d`;
}
// packages/core/src/ids.ts
import { randomBytes } from "crypto";
var ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function encode(n, len) {
  let out = "";
  for (let i = len - 1;i >= 0; i--) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}
function randomPart(len) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0;i < len; i++)
    out += ALPHABET[bytes[i] % 32];
  return out;
}
function newId(prefix, nowMs = Date.now()) {
  return `${prefix}_${encode(nowMs, 10)}${randomPart(8)}`;
}
// packages/core/src/registry.ts
class DuplicatePluginError extends Error {
  constructor(kind, id) {
    super(`two ${kind} plugins both claim the id \`${id}\` \u2014 ids must be unique`);
    this.name = "DuplicatePluginError";
  }
}

class UnknownPluginError extends Error {
  constructor(kind, id, known) {
    super(`no ${kind} plugin with id \`${id}\`. Known: ${known.length ? known.join(", ") : "(none registered)"}`);
    this.name = "UnknownPluginError";
  }
}

class Registry {
  kind;
  items = new Map;
  constructor(kind) {
    this.kind = kind;
  }
  register(item) {
    if (this.items.has(item.id))
      throw new DuplicatePluginError(this.kind, item.id);
    this.items.set(item.id, item);
    return this;
  }
  override(item) {
    this.items.set(item.id, item);
    return this;
  }
  has(id) {
    return this.items.has(id);
  }
  get(id) {
    const found = this.items.get(id);
    if (!found)
      throw new UnknownPluginError(this.kind, id, this.ids());
    return found;
  }
  find(id) {
    return this.items.get(id);
  }
  all() {
    return [...this.items.values()];
  }
  ids() {
    return [...this.items.keys()];
  }
  select(ids) {
    return ids.map((id) => this.get(id));
  }
}
// packages/core/src/decision.ts
var VERDICT_SEVERITY = {
  go: 0,
  wait: 1,
  ask: 2,
  deny: 3
};
function worseVerdict(a, b) {
  return VERDICT_SEVERITY[a] >= VERDICT_SEVERITY[b] ? a : b;
}
function ruling(verdict, summary, extra = {}) {
  return { verdict, summary, detail: extra.detail ?? [], remedies: extra.remedies ?? [], retryAfterSec: extra.retryAfterSec ?? null };
}
var wait = (summary, extra) => ruling("wait", summary, extra);
var deny = (summary, extra) => ruling("deny", summary, extra);
var EXIT_CODE = {
  go: 0,
  wait: 10,
  ask: 11,
  deny: 12
};
function verdictLabel(d) {
  if (d.verdict === "wait" && d.retryAfterSec != null)
    return `wait ${humanDuration(d.retryAfterSec)}`;
  return d.verdict;
}
function renderDecision(d) {
  const lines = [`${verdictLabel(d)} \xB7 ${d.summary}`];
  for (const line of d.detail ?? [])
    lines.push(`  ${line}`);
  if (d.remedies?.length) {
    lines.push("");
    for (const r of d.remedies)
      lines.push(`  \u2192 ${r}`);
  }
  return lines.join(`
`);
}
// packages/core/src/freshness.ts
var DEFAULT_FRESHNESS = { staleSec: 150, weekStaleSec: 6 * HOUR };
var FRESHNESS_SEVERITY = {
  ok: 0,
  stale: 1,
  unknown: 2,
  expired: 3
};
function worseFreshness(a, b) {
  return FRESHNESS_SEVERITY[a] >= FRESHNESS_SEVERITY[b] ? a : b;
}
function isLongWindow(w) {
  return w.windowSec >= 24 * HOUR;
}
function windowFreshness(window, ts, now, cfg = DEFAULT_FRESHNESS) {
  if (!window)
    return "unknown";
  if (window.resetsAt != null && now >= window.resetsAt)
    return "expired";
  const age = now - ts;
  if (age < 0)
    return "ok";
  return age > (isLongWindow(window) ? cfg.weekStaleSec : cfg.staleSec) ? "stale" : "ok";
}
function readingFreshness(reading, now, cfg = DEFAULT_FRESHNESS) {
  const windows = Object.values(reading.windows).filter((w) => w != null);
  if (windows.length === 0)
    return reading.provider === "unmetered" ? "ok" : "unknown";
  let worst = "ok";
  for (const w of windows)
    worst = worseFreshness(worst, windowFreshness(w, reading.ts, now, cfg));
  return worst;
}
function withFreshness(reading, now, cfg = DEFAULT_FRESHNESS) {
  return { ...reading, freshness: readingFreshness(reading, now, cfg) };
}
function freshnessOf(reading, kind, now, cfg = DEFAULT_FRESHNESS) {
  if (!reading)
    return "unknown";
  if (reading.provider === "unmetered")
    return "ok";
  return windowFreshness(reading.windows[kind], reading.ts, now, cfg);
}
function isUsableForGate(freshness) {
  return freshness === "ok" || freshness === "stale";
}
function canDeriveRetryAfter(freshness) {
  return isUsableForGate(freshness);
}
// packages/core/src/config.ts
import { readFileSync } from "fs";

// node_modules/.bun/yaml@2.9.0/node_modules/yaml/dist/index.js
var composer = require_composer();
var Document = require_Document();
var Schema = require_Schema();
var errors = require_errors();
var Alias = require_Alias();
var identity = require_identity();
var Pair = require_Pair();
var Scalar = require_Scalar();
var YAMLMap = require_YAMLMap();
var YAMLSeq = require_YAMLSeq();
var cst = require_cst();
var lexer = require_lexer();
var lineCounter = require_line_counter();
var parser = require_parser();
var publicApi = require_public_api();
var visit = require_visit();
var $Composer = composer.Composer;
var $Document = Document.Document;
var $Schema = Schema.Schema;
var $YAMLError = errors.YAMLError;
var $YAMLParseError = errors.YAMLParseError;
var $YAMLWarning = errors.YAMLWarning;
var $Alias = Alias.Alias;
var $isAlias = identity.isAlias;
var $isCollection = identity.isCollection;
var $isDocument = identity.isDocument;
var $isMap = identity.isMap;
var $isNode = identity.isNode;
var $isPair = identity.isPair;
var $isScalar = identity.isScalar;
var $isSeq = identity.isSeq;
var $Pair = Pair.Pair;
var $Scalar = Scalar.Scalar;
var $YAMLMap = YAMLMap.YAMLMap;
var $YAMLSeq = YAMLSeq.YAMLSeq;
var $Lexer = lexer.Lexer;
var $LineCounter = lineCounter.LineCounter;
var $Parser = parser.Parser;
var $parse = publicApi.parse;
var $parseAllDocuments = publicApi.parseAllDocuments;
var $parseDocument = publicApi.parseDocument;
var $stringify = publicApi.stringify;
var $visit = visit.visit;
var $visitAsync = visit.visitAsync;

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/external.js
var exports_external = {};
__export(exports_external, {
  void: () => voidType,
  util: () => util,
  unknown: () => unknownType,
  union: () => unionType,
  undefined: () => undefinedType,
  tuple: () => tupleType,
  transformer: () => effectsType,
  symbol: () => symbolType,
  string: () => stringType,
  strictObject: () => strictObjectType,
  setErrorMap: () => setErrorMap,
  set: () => setType,
  record: () => recordType,
  quotelessJson: () => quotelessJson,
  promise: () => promiseType,
  preprocess: () => preprocessType,
  pipeline: () => pipelineType,
  ostring: () => ostring,
  optional: () => optionalType,
  onumber: () => onumber,
  oboolean: () => oboolean,
  objectUtil: () => objectUtil,
  object: () => objectType,
  number: () => numberType,
  nullable: () => nullableType,
  null: () => nullType,
  never: () => neverType,
  nativeEnum: () => nativeEnumType,
  nan: () => nanType,
  map: () => mapType,
  makeIssue: () => makeIssue,
  literal: () => literalType,
  lazy: () => lazyType,
  late: () => late,
  isValid: () => isValid,
  isDirty: () => isDirty,
  isAsync: () => isAsync,
  isAborted: () => isAborted,
  intersection: () => intersectionType,
  instanceof: () => instanceOfType,
  getParsedType: () => getParsedType,
  getErrorMap: () => getErrorMap,
  function: () => functionType,
  enum: () => enumType,
  effect: () => effectsType,
  discriminatedUnion: () => discriminatedUnionType,
  defaultErrorMap: () => en_default,
  datetimeRegex: () => datetimeRegex,
  date: () => dateType,
  custom: () => custom,
  coerce: () => coerce,
  boolean: () => booleanType,
  bigint: () => bigIntType,
  array: () => arrayType,
  any: () => anyType,
  addIssueToContext: () => addIssueToContext,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransformer: () => ZodEffects,
  ZodSymbol: () => ZodSymbol,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodSchema: () => ZodType,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPipeline: () => ZodPipeline,
  ZodParsedType: () => ZodParsedType,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNever: () => ZodNever,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEffects: () => ZodEffects,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCatch: () => ZodCatch,
  ZodBranded: () => ZodBranded,
  ZodBoolean: () => ZodBoolean,
  ZodBigInt: () => ZodBigInt,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  Schema: () => ZodType,
  ParseStatus: () => ParseStatus,
  OK: () => OK,
  NEVER: () => NEVER,
  INVALID: () => INVALID,
  EMPTY_PATH: () => EMPTY_PATH,
  DIRTY: () => DIRTY,
  BRAND: () => BRAND
});

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {};
  function assertIs(_arg) {}
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error;
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default ? undefined : en_default
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/types.js
class ParseInputLazyPath {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}

class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}

class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};

class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};

class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};

class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};

class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};

class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};

class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};

class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};

class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};

class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : undefined,
          maximum: tooBig ? def.exactLength.value : undefined,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}

class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {} else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== undefined ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};

class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = undefined;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};

class ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(discriminator, options, params) {
    const optionsMap = new Map;
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}

class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};

class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};

class ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
}

class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = new Map;
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = new Map;
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};

class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = new Set;
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};

class ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
}

class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};

class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}

class ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
ZodEnum.create = createZodEnum;

class ZodNativeEnum extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};

class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};

class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(undefined);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};

class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};

class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};

class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};

class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");

class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}

class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}

class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
// packages/core/src/config.ts
var pct = exports_external.number().min(0).max(100);
var fraction = exports_external.number().min(0).max(1);
var FiveHourModeSchema = exports_external.enum(["pace", "burst", "off"]);
var AccountSchema = exports_external.object({
  provider: exports_external.string().min(1),
  enabled: exports_external.boolean().default(true),
  plan: exports_external.string().optional(),
  weekly_target_pct: pct.default(85),
  five_hour_target_pct: pct.default(90),
  interactive_reserve_pct: pct.default(10),
  max_concurrent: exports_external.number().int().min(0).default(6),
  meter_interval_sec: exports_external.number().int().min(10).default(180),
  config_dir: exports_external.string().optional(),
  codex_home: exports_external.string().optional(),
  oauth_token_env: exports_external.string().optional()
}).passthrough();
var ProjectAccountSchema = exports_external.object({
  weekly_share: exports_external.number().min(0).default(1),
  five_hour: exports_external.object({
    mode: FiveHourModeSchema.default("burst"),
    share: exports_external.number().min(0).optional()
  }).default({ mode: "burst" })
}).passthrough();
var ProjectSchema = exports_external.object({
  enabled: exports_external.boolean().default(true),
  roots: exports_external.array(exports_external.string()).default([]),
  accounts: exports_external.record(exports_external.string(), ProjectAccountSchema).default({})
}).passthrough();
var PolicySchema = exports_external.object({
  chain: exports_external.array(exports_external.string()).default(["account-stop", "reading-guard", "allocation", "concurrency"]),
  weekly: exports_external.object({
    floor_pct: fraction.default(0.15),
    slack_pct: fraction.default(0.05)
  }).default({}),
  freshness: exports_external.object({
    stale_sec: exports_external.number().int().min(1).default(150),
    week_stale_sec: exports_external.number().int().min(1).default(6 * HOUR)
  }).default({}),
  claim_lease_sec: exports_external.number().int().min(10).default(300)
}).default({});
var ServerSchema = exports_external.object({
  host: exports_external.string().default("127.0.0.1"),
  port: exports_external.number().int().min(1).max(65535).default(7787)
}).default({});
var RemoteSchema = exports_external.object({ url: exports_external.string().min(1) }).passthrough();
var ConfigSchema = exports_external.object({
  accounts: exports_external.record(exports_external.string(), AccountSchema).default({}),
  projects: exports_external.record(exports_external.string(), ProjectSchema).default({}),
  policy: PolicySchema,
  server: ServerSchema,
  remotes: exports_external.record(exports_external.string(), RemoteSchema).default({}),
  default_remote: exports_external.string().optional(),
  remote: exports_external.string().optional()
}).strict();

class ConfigError extends Error {
  file;
  constructor(message, file) {
    super(message);
    this.file = file;
    this.name = "ConfigError";
  }
}
function parseConfig(raw, file) {
  const parsed = ConfigSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new ConfigError(`invalid config:
${lines.join(`
`)}`, file);
  }
  return validate(parsed.data, file);
}
function loadConfig(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new ConfigError(`no config at ${file}
  fix: copy examples/config.yaml there and edit it, then \`chmod 600\` it`, file);
  }
  return parseConfig($parse(text), file);
}
function validate(cfg, file) {
  const problems = [];
  for (const [id, a] of Object.entries(cfg.accounts)) {
    if (a.interactive_reserve_pct >= a.weekly_target_pct) {
      problems.push(`accounts.${id}: interactive_reserve_pct (${a.interactive_reserve_pct}) leaves nothing ` + `dispatchable below weekly_target_pct (${a.weekly_target_pct}) \u2014 every request would be refused`);
    }
  }
  if (cfg.default_remote && !cfg.remotes[cfg.default_remote]) {
    const known = Object.keys(cfg.remotes);
    problems.push(`default_remote: \`${cfg.default_remote}\` is not in \`remotes\`` + (known.length ? ` \u2014 configured: ${known.join(", ")}` : " \u2014 no remotes are configured"));
  }
  for (const [pid, p] of Object.entries(cfg.projects)) {
    if (pid === INTERACTIVE) {
      problems.push(`projects.${pid}: \`${INTERACTIVE}\` is reserved for unattributed spend`);
    }
    for (const aid of Object.keys(p.accounts)) {
      if (!cfg.accounts[aid]) {
        problems.push(`projects.${pid}.accounts.${aid}: no such account`);
      }
    }
  }
  if (problems.length)
    throw new ConfigError(`invalid config:
  ${problems.join(`
  `)}`, file);
  return cfg;
}
function dispatchablePool(a) {
  return Math.max(0, a.weekly_target_pct - a.interactive_reserve_pct);
}
function fiveHourPool(a) {
  return Math.max(0, a.five_hour_target_pct - a.interactive_reserve_pct);
}
function fiveHourShare(pa) {
  return pa.five_hour.share ?? pa.weekly_share;
}
function normalisedShare(cfg, projectId, accountId, window) {
  const own = cfg.projects[projectId]?.accounts[accountId];
  if (!own)
    return 0;
  const pick = (pa) => window === "weekly" ? pa.weekly_share : fiveHourShare(pa);
  let total = 0;
  for (const [pid, p] of Object.entries(cfg.projects)) {
    if (!p.enabled)
      continue;
    const pa = p.accounts[accountId];
    if (!pa)
      continue;
    if (window === "five_hour" && pa.five_hour.mode === "off")
      continue;
    total += pick(pa);
  }
  if (total <= 0)
    return 0;
  return pick(own) / total;
}
// packages/core/src/config-edit.ts
import { readFileSync as readFileSync2, writeFileSync } from "fs";
function loadConfigDoc(file) {
  return { doc: $parseDocument(readFileSync2(file, "utf8")), file };
}
function saveConfigDoc(cd) {
  const text = cd.doc.toString();
  let cfg;
  try {
    cfg = parseConfig($parseDocument(text).toJS(), cd.file);
  } catch (e) {
    throw e instanceof ConfigError ? e : new ConfigError(e.message, cd.file);
  }
  writeFileSync(cd.file, text, { mode: 384 });
  return cfg;
}
function setShare(cd, projectId, accountId, weight) {
  requireProject(cd, projectId);
  const path = ["projects", projectId, "accounts", accountId];
  if (!cd.doc.hasIn(path)) {
    cd.doc.setIn([...path, "weekly_share"], weight);
    return;
  }
  cd.doc.setIn([...path, "weekly_share"], weight);
}
function revokeAccount(cd, projectId, accountId) {
  requireProject(cd, projectId);
  cd.doc.deleteIn(["projects", projectId, "accounts", accountId]);
}
function addProject(cd, p) {
  if (cd.doc.hasIn(["projects", p.id])) {
    throw new ConfigError(`project \`${p.id}\` already exists`, cd.file);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(p.id)) {
    throw new ConfigError(`\`${p.id}\` is not a usable project name \u2014 use letters, digits, dot, dash or underscore`, cd.file);
  }
  cd.doc.setIn(["projects", p.id, "roots"], p.roots);
  for (const [accountId, weight] of Object.entries(p.accounts)) {
    cd.doc.setIn(["projects", p.id, "accounts", accountId, "weekly_share"], weight);
  }
}
function removeProject(cd, projectId) {
  requireProject(cd, projectId);
  cd.doc.deleteIn(["projects", projectId]);
}
function setProjectRoots(cd, projectId, roots) {
  requireProject(cd, projectId);
  cd.doc.setIn(["projects", projectId, "roots"], roots);
}
function setProjectEnabled(cd, projectId, enabled) {
  requireProject(cd, projectId);
  cd.doc.setIn(["projects", projectId, "enabled"], enabled);
}
var ACCOUNT_FIELDS = [
  "weekly_target_pct",
  "five_hour_target_pct",
  "interactive_reserve_pct",
  "max_concurrent",
  "meter_interval_sec"
];
function setAccountField(cd, accountId, field, value) {
  if (!cd.doc.hasIn(["accounts", accountId])) {
    throw new ConfigError(`no account \`${accountId}\``, cd.file);
  }
  if (!ACCOUNT_FIELDS.includes(field)) {
    throw new ConfigError(`\`${field}\` is not an editable account field`, cd.file);
  }
  cd.doc.setIn(["accounts", accountId, field], value);
}
function requireProject(cd, projectId) {
  if (!cd.doc.hasIn(["projects", projectId])) {
    throw new ConfigError(`no project \`${projectId}\``, cd.file);
  }
}
// packages/core/src/db.ts
import { Database } from "bun:sqlite";
import { readFileSync as readFileSync3, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");
function openDb(file) {
  const db = new Database(file, { create: true, strict: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}
function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL
  )`);
  const applied = new Set(db.query("SELECT name FROM schema_migrations").all().map((r) => r.name));
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file))
      continue;
    const sql = readFileSync3(join(MIGRATIONS_DIR, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.query("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(file, Math.floor(Date.now() / 1000));
    })();
  }
}
function tx(db, fn) {
  return db.transaction(fn)();
}
// packages/core/src/paths.ts
import { homedir } from "os";
import { isAbsolute, join as join2, resolve } from "path";
function expandHome(p) {
  if (p === "~")
    return homedir();
  if (p.startsWith("~/"))
    return join2(homedir(), p.slice(2));
  return p;
}
function absolute(p, base = process.cwd()) {
  const e = expandHome(p);
  return isAbsolute(e) ? e : resolve(base, e);
}

class Paths {
  home;
  constructor(home) {
    this.home = home;
  }
  static fromEnv(env = process.env) {
    return new Paths(expandHome(env.OVERTON_HOME ?? "~/.overton"));
  }
  get configFile() {
    return join2(this.home, "config.yaml");
  }
  get dbFile() {
    return join2(this.home, "overton.db");
  }
  get socketFile() {
    return join2(this.home, "overton.sock");
  }
}
function claudeProjectsDir(configDir) {
  return join2(expandHome(configDir), "projects");
}
function claudeCredentialsFile(configDir) {
  return join2(expandHome(configDir), ".credentials.json");
}
function codexSessionsDir(codexHome) {
  return join2(expandHome(codexHome), "sessions");
}
// packages/core/src/fmt.ts
var PACE_RESOLUTION = 0.05;
function paceState(used, allowance, over) {
  if (over)
    return { kind: "over", deltaPts: used - allowance };
  const under = allowance - used;
  if (under > PACE_RESOLUTION)
    return { kind: "under", deltaPts: under };
  return { kind: "on-pace" };
}
function formatPaceDelta(deltaPts) {
  if (!Number.isFinite(deltaPts))
    return "\u2014";
  const d = Math.abs(deltaPts);
  return d <= PACE_RESOLUTION ? "<0.1" : d.toFixed(1);
}
function paceText(state) {
  if (state.kind === "over")
    return `over ${formatPaceDelta(state.deltaPts)}`;
  if (state.kind === "under")
    return `under ${formatPaceDelta(state.deltaPts)}`;
  return "on pace";
}
function bar(pct2, width = 10) {
  const clamped = Math.max(0, Math.min(100, pct2));
  const filled = Math.round(clamped / 100 * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}
function pad(s, n) {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}
function table(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const line = (cells) => cells.map((c, i) => pad(c ?? "", widths[i])).join("  ").trimEnd();
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join(`
`);
}
// packages/providers/src/anthropic.ts
import { execFile as execFile2 } from "child_process";
import { promisify as promisify2 } from "util";

// packages/providers/src/types.ts
class ProviderError extends Error {
  kind;
  retryable;
  constructor(message, kind, retryable = true) {
    super(message);
    this.kind = kind;
    this.retryable = retryable;
    this.name = "ProviderError";
  }
}

// packages/providers/src/credentials.ts
import { createHash } from "crypto";
import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";
var execFileAsync = promisify(execFile);
function keychainService(configDir) {
  const digest = createHash("sha256").update(expandHome(configDir)).digest("hex").slice(0, 8);
  return `Claude Code-credentials-${digest}`;
}
async function securityFindPassword(service) {
  try {
    const { stdout } = await execFileAsync("security", ["find-generic-password", "-s", service, "-w"], {
      timeout: 5000,
      maxBuffer: 1 << 20
    });
    const out = stdout.trim();
    return out === "" ? null : out;
  } catch {
    return null;
  }
}
var defaultCredentialDeps = {
  env: process.env,
  platform: process.platform,
  keychain: securityFindPassword,
  async readFile(path) {
    try {
      return await readFile(path, "utf8");
    } catch {
      return null;
    }
  }
};
function parseCredentialBlob(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const oauth = parsed?.claudeAiOauth;
  const token = oauth?.accessToken;
  if (typeof token !== "string" || token === "")
    return null;
  const out = { token };
  if (typeof oauth?.expiresAt === "number" && Number.isFinite(oauth.expiresAt)) {
    out.expiresAt = oauth.expiresAt > 100000000000 ? Math.floor(oauth.expiresAt / 1000) : Math.floor(oauth.expiresAt);
  }
  const sub = oauth?.subscriptionType ?? parsed?.subscriptionType;
  if (typeof sub === "string" && sub !== "")
    out.subscriptionType = sub;
  return out;
}
async function readClaudeToken(account, deps = {}) {
  const d = { ...defaultCredentialDeps, ...deps };
  const tried = [];
  if (account.oauth_token_env) {
    const raw = d.env[account.oauth_token_env];
    if (typeof raw === "string" && raw.trim() !== "")
      return { token: raw.trim() };
    tried.push(`$${account.oauth_token_env} (unset or empty)`);
  }
  if (account.config_dir) {
    if (d.platform === "darwin") {
      const service = keychainService(account.config_dir);
      const raw2 = await d.keychain(service);
      const parsed2 = raw2 ? parseCredentialBlob(raw2) : null;
      if (parsed2)
        return parsed2;
      tried.push(`keychain item \`${service}\``);
    }
    const file = claudeCredentialsFile(account.config_dir);
    const raw = await d.readFile(file);
    const parsed = raw ? parseCredentialBlob(raw) : null;
    if (parsed)
      return parsed;
    tried.push(file);
  }
  throw new ProviderError(`no Claude OAuth token for this account \u2014 looked in: ${tried.join(", ") || "(nothing configured)"}
` + `  fix: run \`claude\` once in that profile to sign in ` + `(CLAUDE_CONFIG_DIR=${account.config_dir ?? "<config_dir>"}), or set \`oauth_token_env\` ` + `to an env var holding a \`claude setup-token\` value`, "auth", false);
}

// packages/providers/src/anthropic.ts
var execFileAsync2 = promisify2(execFile2);
var USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
var OAUTH_BETA = "oauth-2025-04-20";
var FALLBACK_CLAUDE_VERSION = "2.0.0";
var DEFAULT_TIMEOUT_MS = 1e4;
function parseClaudeVersion(stdout) {
  const m = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/.exec(stdout ?? "");
  return m ? m[0] : FALLBACK_CLAUDE_VERSION;
}
function buildHeaders(token, version) {
  const v = version && version.trim() !== "" ? version.trim() : FALLBACK_CLAUDE_VERSION;
  return {
    Authorization: `Bearer ${token}`,
    "anthropic-beta": OAUTH_BETA,
    "User-Agent": `claude-code/${v}`
  };
}
var TOP_LEVEL = [
  { key: "five_hour", kind: "five_hour", windowSec: FIVE_HOURS },
  { key: "seven_day", kind: "seven_day", windowSec: WEEK },
  { key: "seven_day_opus", kind: "seven_day_opus", windowSec: WEEK },
  { key: "seven_day_sonnet", kind: "seven_day_sonnet", windowSec: WEEK }
];
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function pct2(v) {
  if (typeof v !== "number" || !Number.isFinite(v))
    return null;
  return Math.max(0, Math.min(100, v));
}
function modelWindowKind(displayName) {
  if (typeof displayName !== "string")
    return null;
  const n = displayName.toLowerCase();
  if (n.includes("opus"))
    return "seven_day_opus";
  if (n.includes("sonnet"))
    return "seven_day_sonnet";
  return null;
}
function parseLimits(limits) {
  const out = {};
  if (!Array.isArray(limits))
    return out;
  for (const entry of limits) {
    try {
      if (!isObject(entry))
        continue;
      const utilization = pct2(entry.percent);
      if (utilization == null)
        continue;
      let kind = null;
      let windowSec = WEEK;
      if (entry.kind === "session") {
        kind = "five_hour";
        windowSec = FIVE_HOURS;
      } else if (entry.kind === "weekly_all") {
        kind = "seven_day";
      } else if (entry.kind === "weekly_scoped") {
        const scope = isObject(entry.scope) ? entry.scope : null;
        const model = scope && isObject(scope.model) ? scope.model : null;
        kind = modelWindowKind(model?.display_name);
      }
      if (!kind || out[kind])
        continue;
      out[kind] = { kind, utilizationPct: utilization, resetsAt: toEpoch(entry.resets_at), windowSec };
    } catch {
      continue;
    }
  }
  return out;
}
function parseUsage(body, accountId, ctx, plan) {
  const windows = {};
  if (isObject(body)) {
    for (const { key, kind, windowSec } of TOP_LEVEL) {
      const raw = body[key];
      if (!isObject(raw))
        continue;
      const utilization = pct2(raw.utilization);
      if (utilization == null)
        continue;
      windows[kind] = { kind, utilizationPct: utilization, resetsAt: toEpoch(raw.resets_at), windowSec };
    }
    for (const [kind, w] of Object.entries(parseLimits(body.limits))) {
      if (!windows[kind])
        windows[kind] = w;
    }
  }
  if (Object.keys(windows).length === 0) {
    throw new ProviderError("oauth/usage returned no recognisable window \u2014 five_hour/seven_day are absent and limits[] was unusable", "schema", false);
  }
  const reading = {
    accountId,
    provider: "anthropic",
    ts: ctx.now,
    fetchedAt: ctx.now,
    windows,
    freshness: "ok"
  };
  if (plan)
    reading.plan = plan;
  reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
  return reading;
}

class AnthropicProvider {
  id = "anthropic";
  description = "Claude subscriptions, via the OAuth usage endpoint";
  metered = true;
  opts;
  version = null;
  constructor(opts = {}) {
    this.opts = {
      readToken: opts.readToken ?? readClaudeToken,
      claudeVersion: opts.claudeVersion ?? (async () => (await execFileAsync2("claude", ["--version"], { timeout: 5000 })).stdout),
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    };
  }
  async check(_accountId, account, ctx) {
    if (!account.config_dir && !account.oauth_token_env) {
      return ["needs `config_dir` (a Claude profile directory) or `oauth_token_env`"];
    }
    try {
      await this.opts.readToken(account, { env: ctx.env });
      return [];
    } catch (e) {
      return [e.message];
    }
  }
  resolveVersion() {
    this.version ??= this.opts.claudeVersion().then(parseClaudeVersion).catch(() => FALLBACK_CLAUDE_VERSION);
    return this.version;
  }
  async read(accountId, account, ctx) {
    const [token, version] = await Promise.all([
      this.opts.readToken(account, { env: ctx.env }),
      this.resolveVersion()
    ]);
    let res;
    try {
      res = await ctx.fetch(USAGE_URL, {
        method: "GET",
        headers: buildHeaders(token.token, version),
        signal: AbortSignal.timeout(this.opts.timeoutMs)
      });
    } catch (e) {
      throw new ProviderError(`oauth/usage unreachable: ${e.name}`, "transport", true);
    }
    if (!res.ok)
      throw statusError(res.status);
    let body;
    try {
      body = await res.json();
    } catch {
      throw new ProviderError("oauth/usage returned a body that is not JSON", "schema", false);
    }
    return parseUsage(body, accountId, ctx, account.plan ?? token.subscriptionType);
  }
}
function statusError(status) {
  if (status === 401 || status === 403) {
    return new ProviderError(`oauth/usage rejected the token (HTTP ${status}) \u2014 run \`claude\` in that profile to re-authenticate`, "auth", false);
  }
  if (status === 429)
    return new ProviderError("oauth/usage rate-limited (HTTP 429)", "ratelimited", true);
  if (status >= 500)
    return new ProviderError(`oauth/usage server error (HTTP ${status})`, "transport", true);
  return new ProviderError(`oauth/usage returned HTTP ${status}`, "transport", false);
}

// packages/providers/src/codex.ts
import { open, readdir, stat } from "fs/promises";
import { join as join3 } from "path";
var LONG_WINDOW_MINUTES = 24 * 60;
async function listSessionFiles(dir) {
  let names;
  try {
    names = await readdir(dir, { recursive: true });
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    if (!name.endsWith(".jsonl"))
      continue;
    const path = join3(dir, name);
    try {
      const st = await stat(path);
      if (!st.isFile())
        continue;
      out.push({ path, mtime: Math.floor(st.mtimeMs / 1000), size: st.size });
    } catch {
      continue;
    }
  }
  return out;
}
async function readTail(file, bytes) {
  const start = Math.max(0, file.size - bytes);
  const length = file.size - start;
  if (length <= 0)
    return "";
  const fh = await open(file.path, "r");
  try {
    const buf = Buffer.alloc(length);
    await fh.read(buf, 0, length, start);
    const text = buf.toString("utf8");
    return start > 0 ? text.slice(text.indexOf(`
`) + 1) : text;
  } finally {
    await fh.close();
  }
}
function isObject2(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function parseRateLimits(rateLimits) {
  const out = {};
  if (!isObject2(rateLimits))
    return out;
  const raw = [];
  for (const value of Object.values(rateLimits)) {
    if (!isObject2(value))
      continue;
    const windowMinutes = value.window_minutes;
    const usedPercent = value.used_percent;
    if (typeof windowMinutes !== "number" || !Number.isFinite(windowMinutes) || windowMinutes <= 0)
      continue;
    if (typeof usedPercent !== "number" || !Number.isFinite(usedPercent))
      continue;
    raw.push({
      windowMinutes,
      usedPercent: Math.max(0, Math.min(100, usedPercent)),
      resetsAt: toEpoch(value.resets_at)
    });
  }
  raw.sort((a, b) => a.windowMinutes - b.windowMinutes);
  for (const w of raw) {
    const kind = w.windowMinutes < LONG_WINDOW_MINUTES ? "five_hour" : "seven_day";
    if (out[kind])
      continue;
    out[kind] = {
      kind,
      utilizationPct: w.usedPercent,
      resetsAt: w.resetsAt,
      windowSec: Math.round(w.windowMinutes * 60)
    };
  }
  return out;
}
function extractRateLimits(text, fallbackTs) {
  let best = null;
  for (const line of text.split(`
`)) {
    if (!line.includes('"rate_limits"'))
      continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObject2(obj))
      continue;
    const payload = isObject2(obj.payload) ? obj.payload : null;
    const rateLimits = payload?.rate_limits ?? obj.rate_limits;
    if (!isObject2(rateLimits))
      continue;
    const windows = parseRateLimits(rateLimits);
    if (Object.keys(windows).length === 0)
      continue;
    const ts = toEpoch(obj.timestamp) ?? toEpoch(payload?.timestamp) ?? fallbackTs;
    if (best && ts <= best.ts)
      continue;
    const snapshot = { ts, windows };
    const plan = rateLimits.plan_type ?? payload?.plan_type;
    if (typeof plan === "string" && plan !== "")
      snapshot.plan = plan;
    best = snapshot;
  }
  return best;
}

class CodexProvider {
  id = "codex";
  description = "Codex subscriptions, via rate_limits in rollout JSONL";
  metered = true;
  opts;
  constructor(opts = {}) {
    this.opts = {
      listSessionFiles: opts.listSessionFiles ?? listSessionFiles,
      readTail: opts.readTail ?? readTail,
      maxFiles: opts.maxFiles ?? 5,
      tailBytes: opts.tailBytes ?? 256 * 1024
    };
  }
  async check(_accountId, account) {
    if (!account.codex_home)
      return ["needs `codex_home` (a $CODEX_HOME directory)"];
    const files = await this.opts.listSessionFiles(codexSessionsDir(account.codex_home));
    if (files.length === 0) {
      return [
        `no rollouts under ${codexSessionsDir(account.codex_home)} \u2014 ` + `run \`codex\` once in that profile so it writes a session`
      ];
    }
    return [];
  }
  async read(accountId, account, ctx) {
    if (!account.codex_home) {
      throw new ProviderError("codex account has no `codex_home`, so there are no rollouts to read", "missing", false);
    }
    const files = await this.opts.listSessionFiles(codexSessionsDir(account.codex_home));
    if (files.length === 0)
      return null;
    const recent = [...files].sort((a, b) => b.mtime - a.mtime).slice(0, this.opts.maxFiles);
    let best = null;
    for (const file of recent) {
      let text;
      try {
        text = await this.opts.readTail(file, this.opts.tailBytes);
      } catch {
        continue;
      }
      const snapshot = extractRateLimits(text, file.mtime);
      if (snapshot && (!best || snapshot.ts > best.ts))
        best = snapshot;
    }
    if (!best)
      return null;
    const reading = {
      accountId,
      provider: "codex",
      ts: best.ts,
      fetchedAt: ctx.now,
      windows: best.windows,
      freshness: "ok"
    };
    const plan = account.plan ?? best.plan;
    if (plan)
      reading.plan = plan;
    reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
    return reading;
  }
}

// packages/providers/src/unmetered.ts
class UnmeteredProvider {
  id = "unmetered";
  description = "Local or separately-billed capacity \u2014 no window to spend";
  metered = false;
  async check() {
    return [];
  }
  async read(accountId, _account, ctx) {
    const reading = {
      accountId,
      provider: "unmetered",
      ts: ctx.now,
      fetchedAt: ctx.now,
      windows: {},
      freshness: "ok"
    };
    reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
    return reading;
  }
}

// packages/providers/src/index.ts
function defaultProviders() {
  return new Registry("provider").register(new AnthropicProvider).register(new CodexProvider).register(new UnmeteredProvider);
}

// packages/ledger/src/epochs.ts
var UTILIZATION_EPS = 0.001;
var RESET_FORWARD_EPS = 60;
var LARGE_DROP_FRACTION = 0.5;
function toRecord(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    openedAt: row.opened_at,
    resetsAt: row.resets_at,
    closed: row.closed !== 0
  };
}
function currentEpoch(db2, accountId, kind) {
  const row = db2.query(`SELECT id, account_id, kind, opened_at, resets_at, closed FROM window_epochs
       WHERE account_id = ? AND kind = ? AND closed = 0
       ORDER BY opened_at DESC LIMIT 1`).get(accountId, kind);
  return row ? toRecord(row) : null;
}
function syncEpochs(db2, reading, prevReading, now) {
  const synced = [];
  const uncorroborated = [];
  for (const [key, window] of Object.entries(reading.windows)) {
    if (!window)
      continue;
    const kind = key;
    const open2 = currentEpoch(db2, reading.accountId, kind);
    const prev = prevReading?.windows[kind];
    const rawDrop = prev != null && window.utilizationPct < prev.utilizationPct - UTILIZATION_EPS;
    const previousWindowEnded = open2?.resetsAt != null && now >= open2.resetsAt || prev?.resetsAt != null && now >= prev.resetsAt;
    const collapsed = prev != null && window.utilizationPct < prev.utilizationPct * (1 - LARGE_DROP_FRACTION);
    const baselines = [open2?.resetsAt, prev?.resetsAt].filter((v) => v != null);
    const movedForward = window.resetsAt != null && baselines.some((b) => window.resetsAt > b + RESET_FORWARD_EPS);
    const sameWindow = window.resetsAt != null && baselines.some((b) => Math.abs(window.resetsAt - b) <= RESET_FORWARD_EPS);
    const collapseCorroborates = collapsed && window.resetsAt != null && !sameWindow;
    const dropped = rawDrop && (previousWindowEnded || collapseCorroborates);
    if (rawDrop && !dropped && !movedForward) {
      uncorroborated.push({ kind, from: prev.utilizationPct, to: window.utilizationPct });
    }
    if (open2 && !dropped && !movedForward) {
      if (open2.resetsAt == null && window.resetsAt != null) {
        db2.query("UPDATE window_epochs SET resets_at = ? WHERE id = ?").run(window.resetsAt, open2.id);
      }
      synced.push({ epochId: open2.id, kind, rolled: false });
      continue;
    }
    synced.push({ epochId: openEpoch(db2, reading.accountId, kind, window.resetsAt, now), kind, rolled: true });
  }
  return { synced, uncorroborated };
}
function openEpoch(db2, accountId, kind, resetsAt, now) {
  return db2.transaction(() => {
    db2.query("UPDATE window_epochs SET closed = 1 WHERE account_id = ? AND kind = ? AND closed = 0").run(accountId, kind);
    let openedAt = now;
    const clash = db2.query("SELECT COUNT(*) AS n FROM window_epochs WHERE account_id = ? AND kind = ? AND opened_at = ?");
    while ((clash.get(accountId, kind, openedAt)?.n ?? 0) > 0)
      openedAt++;
    const id = newId("win");
    db2.query(`INSERT INTO window_epochs (id, account_id, kind, opened_at, resets_at, closed)
       VALUES (?, ?, ?, ?, ?, 0)`).run(id, accountId, kind, openedAt, resetsAt);
    return id;
  })();
}
function closeElapsedEpochs(db2, now) {
  const before = db2.query("SELECT total_changes() AS n").get()?.n ?? 0;
  db2.query("UPDATE window_epochs SET closed = 1 WHERE closed = 0 AND resets_at IS NOT NULL AND resets_at <= ?").run(now);
  const after = db2.query("SELECT total_changes() AS n").get()?.n ?? 0;
  return after - before;
}
// packages/ledger/src/sources/scan.ts
import { closeSync, openSync, readSync, statSync } from "fs";
function readCursor(db2, path) {
  return db2.query("SELECT path, size, mtime, offset FROM scan_state WHERE path = ?").get(path) ?? null;
}
function writeCursor(db2, accountId, c, now) {
  db2.query(`INSERT INTO scan_state (path, account_id, size, mtime, offset, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET
       size = excluded.size, mtime = excluded.mtime,
       offset = excluded.offset, scanned_at = excluded.scanned_at`).run(c.path, accountId, c.size, c.mtime, c.offset, now);
}
function tailJsonl(path, prev, maxBytes = 8 * 1024 * 1024) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return null;
  }
  const size = st.size;
  const mtime = Math.floor(st.mtimeMs / 1000);
  let offset = prev?.offset ?? 0;
  if (prev && size < prev.size)
    offset = 0;
  if (offset >= size)
    return { lines: [], cursor: { path, size, mtime, offset } };
  if (size - offset > maxBytes)
    offset = size - maxBytes;
  const fd = openSync(path, "r");
  try {
    const len = size - offset;
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, offset);
    const text = buf.toString("utf8");
    const lastNl = text.lastIndexOf(`
`);
    if (lastNl < 0)
      return { lines: [], cursor: { path, size, mtime, offset } };
    const consumed = Buffer.byteLength(text.slice(0, lastNl + 1), "utf8");
    const lines = text.slice(0, lastNl).split(`
`).filter((l) => l.length > 0);
    return { lines, cursor: { path, size, mtime, offset: offset + consumed } };
  } finally {
    closeSync(fd);
  }
}

// packages/ledger/src/events.ts
function saveCostEvents(db2, accountId, events, cursors, projectFor, now) {
  if (!events.length && !cursors.length)
    return 0;
  const ins = db2.query(`INSERT INTO cost_events
       (account_id, source, session_path, event_key, ts, output_tokens, input_tokens, model, cwd, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_path, event_key) DO NOTHING`);
  return tx(db2, () => {
    let stored = 0;
    for (const e of events) {
      const res = ins.run(e.accountId, e.source, e.sessionPath, e.eventKey, e.ts, e.outputTokens, e.inputTokens, e.model ?? null, e.cwd ?? null, projectFor(e));
      stored += res.changes;
    }
    for (const c of cursors)
      writeCursor(db2, accountId, c, now);
    return stored;
  });
}
function proxyByProject(db2, accountId, t0, t1) {
  return db2.query(`SELECT project_id AS projectId,
              SUM(output_tokens) AS outputTokens,
              SUM(input_tokens)  AS inputTokens,
              COUNT(*)           AS events
       FROM cost_events
       WHERE account_id = ? AND ts > ? AND ts <= ?
       GROUP BY project_id`).all(accountId, t0, t1);
}
function lastScanMtime(db2, accountId) {
  return db2.query("SELECT MAX(mtime) AS n FROM scan_state WHERE account_id = ?").get(accountId)?.n ?? 0;
}
// packages/ledger/src/attribute.ts
function activeProjects(db2, accountId, t0, t1) {
  return db2.query(`SELECT DISTINCT project_id FROM claims
       WHERE account_id = ? AND opened_at <= ? AND (closed_at IS NULL OR closed_at >= ?)`).all(accountId, t1, t0).map((r) => r.project_id);
}
function attribute(db2, input) {
  const { accountId, windowKind, windowEpochId, t0, t1, deltaPct } = input;
  if (!(deltaPct > 0))
    return { entries: [], method: "residual", confidence: 1 };
  const buckets = proxyByProject(db2, accountId, t0, t1).filter((b) => b.outputTokens > 0);
  const totalProxy = buckets.reduce((s, b) => s + b.outputTokens, 0);
  let method;
  let weights;
  if (totalProxy > 0) {
    weights = buckets.map((b) => ({
      projectId: b.projectId,
      weight: b.outputTokens / totalProxy,
      proxy: b.outputTokens
    }));
    method = weights.length === 1 ? "sole" : "weighted";
  } else {
    const active = activeProjects(db2, accountId, t0, t1);
    if (active.length === 1) {
      weights = [{ projectId: active[0], weight: 1, proxy: 0 }];
      method = "sole";
    } else if (active.length > 1) {
      weights = active.map((p) => ({ projectId: p, weight: 1 / active.length, proxy: 0 }));
      method = "equal";
    } else {
      weights = [{ projectId: INTERACTIVE, weight: 1, proxy: 0 }];
      method = "residual";
    }
  }
  const entries = weights.map((w) => ({
    accountId,
    windowKind,
    windowEpochId,
    projectId: w.projectId,
    pctDelta: round6(deltaPct * w.weight),
    costProxy: w.proxy,
    method,
    ts: t1
  }));
  if (entries.length > 0) {
    const others = entries.slice(0, -1).reduce((s, e) => s + e.pctDelta, 0);
    entries[entries.length - 1].pctDelta = deltaPct - others;
  }
  const confidence = method === "weighted" || method === "sole" ? totalProxy > 0 ? 1 : 0.6 : method === "equal" ? 0.3 : 1;
  return { entries, method, confidence };
}
function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}
function saveAttribution(db2, entries, intervalStart) {
  if (!entries.length)
    return;
  const ins = db2.query(`INSERT INTO ledger
       (account_id, window_kind, window_epoch_id, project_id, pct_delta, cost_proxy, method, interval_start, ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id, window_kind, window_epoch_id, project_id, interval_start)
     DO UPDATE SET pct_delta = excluded.pct_delta, cost_proxy = excluded.cost_proxy,
                   method = excluded.method, ts = excluded.ts`);
  tx(db2, () => {
    for (const e of entries) {
      ins.run(e.accountId, e.windowKind, e.windowEpochId, e.projectId, e.pctDelta, e.costProxy, e.method, intervalStart, e.ts);
    }
  });
}
// packages/ledger/src/queries.ts
function ledgerUsed(db2, accountId, windowKind, epochId, projectId) {
  return db2.query(`SELECT SUM(pct_delta) AS n FROM ledger
         WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ? AND project_id = ?`).get(accountId, windowKind, epochId, projectId)?.n ?? 0;
}
function ledgerBreakdown(db2, accountId, windowKind, epochId) {
  return db2.query(`SELECT project_id AS projectId,
              SUM(pct_delta) AS pct,
              SUM(cost_proxy) AS proxy,
              COUNT(*) AS entries,
              SUM(CASE WHEN method IN ('sole','weighted') THEN 1 ELSE 0 END) AS confident
       FROM ledger
       WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ?
       GROUP BY project_id
       ORDER BY pct DESC`).all(accountId, windowKind, epochId);
}
function ledgerTotal(db2, accountId, windowKind, epochId) {
  return db2.query(`SELECT SUM(pct_delta) AS n FROM ledger
         WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ?`).get(accountId, windowKind, epochId)?.n ?? 0;
}
function pctPerToken(db2, accountId, windowKind, epochId) {
  const row = db2.query(`SELECT SUM(pct_delta) AS pct, SUM(cost_proxy) AS proxy FROM ledger
       WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ?
         AND method IN ('sole','weighted')
         -- A no-proxy sole row contributes points with zero tokens, which
         -- drifts the rate upward without bound as such intervals accumulate.
         -- Measured 6x high before this clause existed.
         AND cost_proxy > 0`).get(accountId, windowKind, epochId);
  if (!row?.pct || !row.proxy || row.proxy < 1e4)
    return null;
  return row.pct / row.proxy;
}
// packages/ledger/src/resolve.ts
import { realpathSync } from "fs";
import { resolve as resolve2, sep } from "path";
function canonical(p) {
  const abs = resolve2(absolute(p));
  try {
    return realpathSync(abs);
  } catch {
    return abs;
  }
}
function isUnder(child, parent) {
  if (child === parent)
    return true;
  return child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
}
function projectRoots(cfg) {
  const entries = [];
  for (const [projectId, p] of Object.entries(cfg.projects)) {
    if (!p.enabled)
      continue;
    for (const root of p.roots)
      entries.push({ root: canonical(root), projectId });
  }
  entries.sort((a, b) => b.root.length - a.root.length);
  return { entries };
}
function projectForCwd(roots, cwd) {
  if (!cwd)
    return INTERACTIVE;
  const c = canonical(cwd);
  for (const e of roots.entries)
    if (isUnder(c, e.root))
      return e.projectId;
  return INTERACTIVE;
}
// packages/ledger/src/sources/claude.ts
import { readdirSync as readdirSync2, statSync as statSync2 } from "fs";
import { join as join4 } from "path";
function parseClaudeLines(accountId, sessionPath, lines) {
  const byKey = new Map;
  for (const line of lines) {
    if (!line.includes('"usage"'))
      continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d?.type !== "assistant")
      continue;
    const usage = d.message?.usage;
    if (!usage)
      continue;
    const ts = toEpoch(d.timestamp);
    if (ts == null)
      continue;
    const key = String(d.requestId ?? d.message?.id ?? d.uuid ?? `${sessionPath}:${ts}`);
    const out = Number(usage.output_tokens ?? 0) || 0;
    const inp = (Number(usage.input_tokens ?? 0) || 0) + (Number(usage.cache_creation_input_tokens ?? 0) || 0) + (Number(usage.cache_read_input_tokens ?? 0) || 0);
    byKey.set(key, {
      accountId,
      source: "claude-transcript",
      sessionPath,
      eventKey: key,
      ts,
      outputTokens: out,
      inputTokens: inp,
      model: d.message?.model ?? undefined,
      cwd: d.cwd ?? undefined
    });
  }
  return [...byKey.values()];
}
function claudeSessionFiles(account, sinceMtime = 0) {
  if (!account.config_dir)
    return [];
  const root = claudeProjectsDir(account.config_dir);
  const out = [];
  let dirs;
  try {
    dirs = readdirSync2(root);
  } catch {
    return [];
  }
  for (const d of dirs) {
    let files;
    try {
      files = readdirSync2(join4(root, d));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".jsonl"))
        continue;
      const p = join4(root, d, f);
      try {
        if (statSync2(p).mtimeMs / 1000 >= sinceMtime)
          out.push(p);
      } catch {}
    }
  }
  return out;
}

class ClaudeCostSource {
  id = "claude-transcript";
  description = "Output tokens from Claude Code session transcripts";
  supports(account) {
    return !!account.config_dir;
  }
  scan(db2, accountId, account, sinceMtime = 0) {
    const events = [];
    const cursors = [];
    for (const path of claudeSessionFiles(account, sinceMtime)) {
      const tail = tailJsonl(path, readCursor(db2, path));
      if (!tail)
        continue;
      if (tail.lines.length)
        events.push(...parseClaudeLines(accountId, path, tail.lines));
      cursors.push(tail.cursor);
    }
    return { events, cursors };
  }
}

// packages/ledger/src/sources/codex.ts
import { readdirSync as readdirSync3, statSync as statSync3 } from "fs";
import { join as join5 } from "path";
function parseCodexLines(accountId, sessionPath, lines, carried) {
  const events = [];
  let prev = carried;
  let cwd;
  let model;
  for (const line of lines) {
    if (!line.includes('"token_count"') && !line.includes('"cwd"'))
      continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const p = d?.payload;
    if (!p || typeof p !== "object")
      continue;
    if (d.type === "session_meta" || p.type === "session_meta") {
      if (p.cwd)
        cwd = String(p.cwd);
      continue;
    }
    if (d.type === "turn_context" || p.type === "turn_context") {
      if (p.cwd)
        cwd = String(p.cwd);
      if (p.model)
        model = String(p.model);
      continue;
    }
    if (p.type !== "token_count")
      continue;
    const ts = toEpoch(d.timestamp);
    if (ts == null)
      continue;
    const total = p.info?.total_token_usage;
    if (!total)
      continue;
    const curr = {
      output: Number(total.output_tokens ?? 0) || 0,
      input: Number(total.input_tokens ?? 0) || 0
    };
    let outDelta = curr.output;
    let inDelta = curr.input;
    if (prev) {
      outDelta = curr.output - prev.output;
      inDelta = curr.input - prev.input;
    }
    prev = curr;
    if (outDelta <= 0 && inDelta <= 0)
      continue;
    events.push({
      accountId,
      source: "codex-rollout",
      sessionPath,
      eventKey: `${ts}:${curr.output}:${curr.input}`,
      ts,
      outputTokens: Math.max(0, outDelta),
      inputTokens: Math.max(0, inDelta),
      model,
      cwd
    });
  }
  return { events, total: prev };
}
function codexSessionFiles(account, sinceMtime = 0) {
  if (!account.codex_home)
    return [];
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 4)
      return;
    let entries;
    try {
      entries = readdirSync3(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join5(dir, e.name);
      if (e.isDirectory())
        walk(p, depth + 1);
      else if (e.name.endsWith(".jsonl")) {
        try {
          if (statSync3(p).mtimeMs / 1000 >= sinceMtime)
            out.push(p);
        } catch {}
      }
    }
  };
  walk(codexSessionsDir(account.codex_home), 0);
  return out;
}

class CodexCostSource {
  id = "codex-rollout";
  description = "Output tokens from Codex session rollouts";
  supports(account) {
    return !!account.codex_home;
  }
  scan(db2, accountId, account, sinceMtime = 0) {
    const events = [];
    const cursors = [];
    for (const path of codexSessionFiles(account, sinceMtime)) {
      const prev = readCursor(db2, path);
      const full = tailJsonl(path, null, Number.POSITIVE_INFINITY);
      if (!full)
        continue;
      if (prev && prev.size === full.cursor.size && prev.mtime === full.cursor.mtime)
        continue;
      events.push(...parseCodexLines(accountId, path, full.lines).events);
      cursors.push(full.cursor);
    }
    return { events, cursors };
  }
}

// packages/ledger/src/sources/index.ts
function defaultCostSources() {
  return new Registry("cost source").register(new ClaudeCostSource).register(new CodexCostSource);
}
// packages/policy/src/builtin/account-stop.ts
class AccountStopPolicy {
  id = "account-stop";
  description = "Stops every project once the account itself reaches its target";
  evaluate(f) {
    if (!f.metered || f.accountPct == null)
      return null;
    if (f.accountPct < f.account.weekly_target_pct)
      return null;
    const weekly = f.windows.find((w) => w.window === "weekly");
    const resetsAt = weekly?.reading?.resetsAt ?? null;
    const usable = weekly ? canDeriveRetryAfter(weekly.freshness) : false;
    const retryAfterSec = usable && resetsAt != null ? Math.max(0, resetsAt - f.now) : null;
    return wait(`${f.accountId} is at ${f.accountPct.toFixed(0)}% of its weekly window (target ${f.account.weekly_target_pct}%)`, {
      detail: [
        "the target is a stop for the whole account, not a per-project one",
        resetsAt != null ? `window resets in ${humanDuration(resetsAt - f.now)}` : "reset time unknown"
      ],
      remedies: alternatives(f),
      retryAfterSec
    });
  }
}
function alternatives(f) {
  const out = [];
  for (const alt of f.alternatives) {
    if (alt.accountId === f.accountId)
      continue;
    if (alt.alloc - alt.used > 0) {
      out.push(`try --account ${alt.accountId} (${alt.used.toFixed(1)} of ${alt.alloc.toFixed(1)} pts used)`);
    }
  }
  out.push("run it anyway with --force \u2014 logged, and counted against the next window");
  return out;
}

// packages/policy/src/builtin/reading-guard.ts
class ReadingGuardPolicy {
  id = "reading-guard";
  description = "Refuses when the reading is too degraded to gate on honestly";
  evaluate(f) {
    if (!f.metered)
      return null;
    const blocked = f.windows.find((w) => w.blocked);
    if (!blocked)
      return null;
    const age = f.reading ? humanDuration(f.now - f.reading.ts) : null;
    return wait(`cannot gate ${f.accountId} honestly: ${blocked.blocked}`, {
      detail: [
        "a degraded reading may only tighten a gate, never open one",
        f.reading ? `last reading ${age} old, from provider \`${f.reading.provider}\`` : "no reading at all"
      ],
      remedies: [
        `wait for the next poll (this account meters every ${f.account.meter_interval_sec}s)`,
        "use an unmetered account for this piece of work",
        "overton doctor \u2014 check the account's credentials"
      ],
      retryAfterSec: f.account.meter_interval_sec
    });
  }
}

// packages/policy/src/allocator.ts
function windowKindFor(w) {
  return w === "weekly" ? "seven_day" : "five_hour";
}
function windowSecFor(w) {
  return w === "weekly" ? WEEK : FIVE_HOURS;
}
function dispatchableFor(account, w) {
  return w === "weekly" ? dispatchablePool(account) : fiveHourPool(account);
}
function allocFor(cfg, projectId, accountId, w) {
  const account = cfg.accounts[accountId];
  if (!account)
    return 0;
  return dispatchableFor(account, w) * normalisedShare(cfg, projectId, accountId, w);
}
function allowanceFor(args) {
  const { alloc, resetsAt, windowSec, now, floorPct, slackPct } = args;
  const elapsed = resetsAt == null ? 0 : elapsedFraction(resetsAt, windowSec, now);
  const floor = alloc * floorPct;
  const slack = alloc * slackPct;
  return { alloc, elapsed, allowance: Math.max(floor, elapsed * alloc) + slack, floor, slack };
}
function projectedFinish(used, elapsed) {
  if (elapsed <= 0.01)
    return null;
  return used / elapsed;
}

// packages/policy/src/builtin/allocation.ts
class AllocationPolicy {
  id = "allocation";
  description = "Paces each project against its share of the window";
  evaluate(f) {
    if (!f.metered)
      return null;
    if (!f.projectAccount) {
      return deny(`${f.projectId} is not configured to use ${f.accountId}`, {
        detail: ["a project may only spend on accounts it names in config"],
        remedies: [`add \`projects.${f.projectId}.accounts.${f.accountId}\` to config.yaml`, ...alternatives(f)]
      });
    }
    const weekly = f.windows.find((w) => w.window === "weekly");
    if (weekly && weekly.alloc <= 0) {
      return deny(`${f.projectId} is allocated nothing on ${f.accountId}`, {
        detail: ["its weekly_share resolves to 0, so there is no budget to spend"],
        remedies: [
          `give it a weekly_share in config.yaml, or route to another account`,
          ...alternatives(f)
        ]
      });
    }
    const over = f.windows.find((w) => w.used + w.staleAdjustment > w.allowance);
    if (!over)
      return null;
    return wait(`${f.projectId} is over its ${over.window === "weekly" ? "weekly" : "5-hour"} allocation on ${f.accountId}`, { detail: explain(f, over), remedies: alternatives(f), retryAfterSec: retryAfter(f, over) });
  }
}
function explain(f, w) {
  const used = w.used + w.staleAdjustment;
  const projected = projectedFinish(used, w.elapsed);
  const label = w.window === "weekly" ? "7d" : "5h";
  const lines = [
    `account   ${f.accountId}  ${label} ${f.accountPct?.toFixed(0) ?? "?"}% used ` + `(target ${f.account.weekly_target_pct}, your reserve ${f.account.interactive_reserve_pct})`,
    `project   ${f.projectId}  alloc ${w.alloc.toFixed(1)} pts  used ${used.toFixed(1)} pts`,
    w.mode === "pace" ? `clock     ${(w.elapsed * 100).toFixed(0)}% of the window elapsed \u2192 allowance ${w.allowance.toFixed(1)} pts` : `ceiling   burst mode: a flat ceiling of ${w.allowance.toFixed(1)} pts, no pacing`,
    `reading   ${w.freshness}${f.reading ? `, ${humanDuration(f.now - f.reading.ts)} old` : ""}`,
    `over by ${(used - w.allowance).toFixed(1)} pts.` + (projected ? ` At this rate it finishes the window at ${projected.toFixed(1)} pts ` + `(${(projected / w.alloc * 100).toFixed(0)}% of alloc).` : "")
  ];
  if (w.staleAdjustment > 0) {
    lines.push(`includes ${w.staleAdjustment.toFixed(1)} pts estimated since the last reading \u2014 stale readings tighten`);
  }
  return lines;
}
function retryAfter(f, w) {
  if (!w.reading || !canDeriveRetryAfter(w.freshness))
    return null;
  const resetsAt = w.reading.resetsAt;
  if (resetsAt == null)
    return null;
  const untilReset = Math.max(0, resetsAt - f.now);
  if (w.mode !== "pace" || w.alloc <= 0)
    return untilReset;
  const used = w.used + w.staleAdjustment;
  const slack = w.alloc * f.policy.weekly.slack_pct;
  const neededElapsed = (used - slack) / w.alloc;
  if (neededElapsed >= 1)
    return untilReset;
  const windowStart = resetsAt - w.reading.windowSec;
  const catchUpAt = windowStart + neededElapsed * w.reading.windowSec;
  return Math.max(0, Math.min(untilReset, Math.ceil(catchUpAt - f.now)));
}

// packages/policy/src/builtin/concurrency.ts
class ConcurrencyPolicy {
  id = "concurrency";
  description = "Caps simultaneous claims, per account and per project";
  evaluate(f) {
    if (f.account.max_concurrent > 0 && f.claims.account >= f.account.max_concurrent) {
      return wait(`${f.accountId} is at its concurrency ceiling (${f.claims.account}/${f.account.max_concurrent})`, {
        detail: ["counted across every project on this account"],
        remedies: [
          "wait for a claim to close",
          "overton claims --account " + f.accountId + " \u2014 see what is holding them",
          `raise accounts.${f.accountId}.max_concurrent if the host can take it`
        ],
        retryAfterSec: 30
      });
    }
    const five = f.windows.find((w) => w.window === "five_hour");
    if (five?.mode === "burst") {
      const cap = burstCapFor(f);
      if (cap != null && f.claims.project >= cap) {
        return wait(`${f.projectId} already holds ${f.claims.project}/${cap} of its concurrency share on ${f.accountId}`, {
          detail: [
            "the 5h share governs simultaneous capacity so one project cannot monopolise a refill",
            `share \xD7 account max_concurrent ${f.account.max_concurrent} \u2192 ${cap}`
          ],
          remedies: ["wait for one of this project's claims to close"],
          retryAfterSec: 30
        });
      }
    }
    return null;
  }
}
function burstCapFor(f) {
  if (f.account.max_concurrent <= 0)
    return null;
  return Math.max(1, Math.ceil(f.shares.fiveHour * f.account.max_concurrent));
}
// packages/policy/src/chain.ts
function runChain(policies, facts) {
  const rulings = [];
  for (const policy of policies) {
    let r;
    try {
      r = policy.evaluate(facts);
    } catch (e) {
      r = {
        verdict: "ask",
        summary: `policy \`${policy.id}\` failed: ${e.message}`,
        detail: ["a policy that cannot decide is treated as a refusal, never as consent"],
        remedies: ["fix or remove the policy", "overton ask --explain for the facts it was given"],
        retryAfterSec: null
      };
    }
    if (r)
      rulings.push({ ...r, policy: policy.id });
  }
  rulings.sort((a, b) => VERDICT_SEVERITY[b.verdict] - VERDICT_SEVERITY[a.verdict]);
  const worst = rulings.reduce((acc, r) => worseVerdict(acc, r.verdict), "go");
  const winner = rulings.find((r) => r.verdict === worst);
  const base = {
    detail: [],
    remedies: [],
    retryAfterSec: null,
    rulings,
    request: { project: facts.projectId, account: facts.accountId, at: facts.now }
  };
  if (!winner || worst === "go") {
    return {
      ...base,
      verdict: "go",
      policy: winner?.policy ?? "chain",
      summary: `${facts.projectId} may dispatch on ${facts.accountId}`,
      detail: goDetail(facts)
    };
  }
  return {
    ...base,
    verdict: winner.verdict,
    policy: winner.policy,
    summary: winner.summary,
    detail: winner.detail ?? [],
    remedies: winner.remedies ?? [],
    retryAfterSec: shortestRetry(rulings, worst)
  };
}
function shortestRetry(rulings, verdict) {
  const values = rulings.filter((r) => r.verdict === verdict && r.retryAfterSec != null).map((r) => r.retryAfterSec);
  return values.length ? Math.min(...values) : null;
}
function goDetail(facts) {
  if (!facts.metered)
    return ["unmetered account \u2014 no window to spend"];
  return facts.windows.map((w) => {
    const used = w.used + w.staleAdjustment;
    const label = w.window === "weekly" ? "7d" : "5h";
    return `${label}  used ${used.toFixed(1)} of ${w.allowance.toFixed(1)} pts allowed ` + `(alloc ${w.alloc.toFixed(1)}, ${(w.elapsed * 100).toFixed(0)}% elapsed)`;
  });
}
function recordDecision(db2, decision2) {
  const id = newId("dec");
  db2.query(`INSERT INTO decisions (id, ts, project_id, account_id, verdict, policy, summary, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, decision2.request.at, decision2.request.project, decision2.request.account, decision2.verdict, decision2.policy, decision2.summary, JSON.stringify(decision2));
  return id;
}

// packages/policy/src/index.ts
function defaultPolicies() {
  return new Registry("policy").register(new AccountStopPolicy).register(new ReadingGuardPolicy).register(new AllocationPolicy).register(new ConcurrencyPolicy);
}

// packages/engine/src/claims.ts
function toClaim(r) {
  return {
    id: r.id,
    projectId: r.project_id,
    accountId: r.account_id,
    state: r.state,
    openedAt: r.opened_at,
    heartbeatAt: r.heartbeat_at,
    closedAt: r.closed_at,
    label: r.label,
    pid: r.pid
  };
}
function openClaim(db2, input, now) {
  const id = newId("clm");
  db2.query(`INSERT INTO claims (id, project_id, account_id, state, opened_at, heartbeat_at, closed_at, label, pid)
     VALUES (?, ?, ?, 'open', ?, ?, NULL, ?, ?)`).run(id, input.projectId, input.accountId, now, now, input.label ?? null, input.pid ?? null);
  return {
    id,
    projectId: input.projectId,
    accountId: input.accountId,
    state: "open",
    openedAt: now,
    heartbeatAt: now,
    closedAt: null,
    label: input.label ?? null,
    pid: input.pid ?? null
  };
}
function renewClaim(db2, id, now) {
  return db2.query("UPDATE claims SET heartbeat_at = ? WHERE id = ? AND state = 'open'").run(now, id).changes > 0;
}
function closeClaim(db2, id, now) {
  return db2.query("UPDATE claims SET state = 'closed', closed_at = ? WHERE id = ? AND state = 'open'").run(now, id).changes > 0;
}
function openClaims(db2, accountId) {
  const rows = accountId ? db2.query("SELECT * FROM claims WHERE state = 'open' AND account_id = ? ORDER BY opened_at").all(accountId) : db2.query("SELECT * FROM claims WHERE state = 'open' ORDER BY opened_at").all();
  return rows.map(toClaim);
}
function countClaims(db2, accountId, projectId) {
  const row = db2.query(`SELECT COUNT(*) AS account,
              SUM(CASE WHEN project_id = ? THEN 1 ELSE 0 END) AS project
       FROM claims WHERE state = 'open' AND account_id = ?`).get(projectId, accountId);
  return { account: row?.account ?? 0, project: row?.project ?? 0 };
}
function reapClaims(db2, now, leaseSec) {
  const cutoff = now - leaseSec;
  return tx(db2, () => {
    const stale = db2.query("SELECT * FROM claims WHERE state = 'open' AND heartbeat_at < ?").all(cutoff);
    if (stale.length) {
      db2.query("UPDATE claims SET state = 'expired', closed_at = ? WHERE state = 'open' AND heartbeat_at < ?").run(now, cutoff);
    }
    return stale.map(toClaim);
  });
}

// packages/engine/src/readings.ts
function toReading(row) {
  return {
    accountId: row.account_id,
    provider: row.provider,
    ts: row.ts,
    fetchedAt: row.fetched_at,
    plan: row.plan ?? undefined,
    windows: JSON.parse(row.windows),
    freshness: "unknown"
  };
}
function saveReading(db2, reading) {
  db2.query(`INSERT INTO readings (account_id, provider, ts, fetched_at, plan, windows)
     VALUES (?, ?, ?, ?, ?, ?)`).run(reading.accountId, reading.provider, reading.ts, reading.fetchedAt, reading.plan ?? null, JSON.stringify(reading.windows));
}
function latestReading(db2, accountId, now, freshness2) {
  const row = db2.query(`SELECT account_id, provider, ts, fetched_at, plan, windows FROM readings
       WHERE account_id = ? ORDER BY ts DESC, id DESC LIMIT 1`).get(accountId);
  return row ? withFreshness(toReading(row), now, freshness2) : null;
}
function previousReading(db2, accountId, now, freshness2) {
  const rows = db2.query(`SELECT account_id, provider, ts, fetched_at, plan, windows FROM readings
       WHERE account_id = ? ORDER BY ts DESC, id DESC LIMIT 2`).all(accountId);
  const row = rows[1];
  return row ? withFreshness(toReading(row), now, freshness2) : null;
}
function pruneReadings(db2, olderThan) {
  const res = db2.query("DELETE FROM readings WHERE ts < ?").run(olderThan);
  return res.changes;
}

// packages/engine/src/facts.ts
function hasCostSource(cfg, accountId) {
  const a = cfg.accounts[accountId];
  if (!a)
    return false;
  return !!(a.config_dir || a.codex_home);
}
function buildFacts(input) {
  const { db: db2, cfg, projectId, accountId, now, freshness: freshness2, metered } = input;
  const account = cfg.accounts[accountId];
  const projectAccount = cfg.projects[projectId]?.accounts[accountId] ?? null;
  const reading = input.reading !== undefined ? input.reading : latestReading(db2, accountId, now, freshness2);
  const shares = {
    weekly: normalisedShare(cfg, projectId, accountId, "weekly"),
    fiveHour: normalisedShare(cfg, projectId, accountId, "five_hour")
  };
  const windows = [];
  if (metered && projectAccount) {
    for (const window of ["weekly", "five_hour"]) {
      const mode = window === "weekly" ? "pace" : projectAccount.five_hour.mode;
      if (mode === "off")
        continue;
      const kind = windowKindFor(window);
      const w = reading?.windows[kind] ?? null;
      const reported = reading ? !!w : false;
      const epoch = currentEpoch(db2, accountId, kind);
      const alloc = allocFor(cfg, projectId, accountId, window);
      const used = epoch ? ledgerUsed(db2, accountId, kind, epoch.id, projectId) : 0;
      const wf = freshnessOf(reading, kind, now, freshness2);
      const stale = staleAdjustment({
        db: db2,
        cfg,
        projectId,
        accountId,
        now,
        reading,
        kind,
        epochId: epoch?.id ?? null,
        freshness: wf,
        reported,
        hasSource: hasCostSource(cfg, accountId)
      });
      const a = mode === "burst" ? { allowance: alloc, elapsed: 1 } : allowanceFor({
        alloc,
        resetsAt: w?.resetsAt ?? null,
        windowSec: w?.windowSec ?? windowSecFor(window),
        now,
        floorPct: cfg.policy.weekly.floor_pct,
        slackPct: cfg.policy.weekly.slack_pct
      });
      windows.push({
        window,
        kind,
        reported,
        freshness: wf,
        epochId: epoch?.id ?? null,
        reading: w,
        mode,
        alloc,
        used,
        allowance: a.allowance,
        elapsed: a.elapsed,
        staleAdjustment: stale.points,
        blocked: stale.blocked
      });
    }
  }
  return {
    now,
    projectId,
    accountId,
    account,
    projectAccount,
    shares,
    metered,
    reading,
    accountPct: reading?.windows.seven_day?.utilizationPct ?? null,
    windows,
    claims: countClaims(db2, accountId, projectId),
    hasCostSource: hasCostSource(cfg, accountId),
    policy: cfg.policy,
    alternatives: alternativesFor(db2, cfg, projectId, accountId, now, freshness2)
  };
}
function staleAdjustment(i) {
  if (!i.reported)
    return { points: 0, blocked: null };
  if (i.freshness === "ok")
    return { points: 0, blocked: null };
  if (i.freshness === "expired" || i.freshness === "unknown" || !i.reading) {
    return { points: 0, blocked: `the ${i.kind} reading is ${i.freshness}` };
  }
  if (!i.hasSource) {
    return {
      points: 0,
      blocked: `the ${i.kind} reading is stale and this account has no local transcript source to price the burn`
    };
  }
  const rate = i.epochId ? pctPerToken(i.db, i.accountId, i.kind, i.epochId) : null;
  const tokens = proxyByProject(i.db, i.accountId, i.reading.ts, i.now).filter((b) => b.projectId === i.projectId).reduce((sum, b) => sum + b.outputTokens, 0);
  if (rate == null) {
    return tokens > 0 ? {
      points: 0,
      blocked: `the reading is stale and ${tokens.toLocaleString()} output tokens have been spent by ` + `${i.projectId} since, with no measured rate to price them`
    } : { points: 0, blocked: null };
  }
  return { points: rate * tokens, blocked: null };
}
function alternativesFor(db2, cfg, projectId, exclude, now, freshness2) {
  const out = [];
  for (const accountId of Object.keys(cfg.projects[projectId]?.accounts ?? {})) {
    if (accountId === exclude)
      continue;
    const account = cfg.accounts[accountId];
    if (!account?.enabled)
      continue;
    const kind = GATED_WINDOWS[1];
    const epoch = currentEpoch(db2, accountId, kind);
    latestReading(db2, accountId, now, freshness2);
    out.push({
      accountId,
      used: epoch ? ledgerUsed(db2, accountId, kind, epoch.id, projectId) : 0,
      alloc: allocFor(cfg, projectId, accountId, "weekly")
    });
  }
  return out;
}

// packages/engine/src/overton.ts
class Overton {
  db;
  cfg;
  clock;
  providers;
  costSources;
  policies;
  configFile;
  roots;
  fetchImpl;
  env;
  constructor(opts) {
    this.db = opts.db;
    this.cfg = opts.cfg;
    this.clock = opts.clock ?? systemClock;
    this.providers = opts.providers ?? defaultProviders();
    this.costSources = opts.costSources ?? defaultCostSources();
    this.policies = opts.policies ?? defaultPolicies();
    this.configFile = opts.configFile ?? null;
    this.roots = projectRoots(opts.cfg);
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.env = opts.env ?? process.env;
  }
  get freshness() {
    return {
      staleSec: this.cfg.policy.freshness.stale_sec,
      weekStaleSec: this.cfg.policy.freshness.week_stale_sec
    };
  }
  providerFor(accountId) {
    const account = this.cfg.accounts[accountId];
    if (!account)
      throw new Error(`unknown account \`${accountId}\``);
    return this.providers.get(account.provider);
  }
  ctx(now) {
    return { now, freshness: this.freshness, fetch: this.fetchImpl, env: this.env };
  }
  chain() {
    return this.policies.select(this.cfg.policy.chain);
  }
  ask(projectId, accountId, opts = {}) {
    const now = this.clock();
    const account = this.cfg.accounts[accountId];
    if (!account) {
      return this.syntheticDeny(projectId, accountId, now, `unknown account \`${accountId}\``, [
        "check the `accounts` block in config.yaml"
      ]);
    }
    if (!account.enabled) {
      return this.syntheticDeny(projectId, accountId, now, `${accountId} is disabled`, [
        `set accounts.${accountId}.enabled: true`
      ]);
    }
    const facts = buildFacts({
      db: this.db,
      cfg: this.cfg,
      projectId,
      accountId,
      now,
      freshness: this.freshness,
      metered: this.providerFor(accountId).metered
    });
    const decision2 = runChain(this.chain(), facts);
    if (opts.record !== false)
      recordDecision(this.db, decision2);
    return decision2;
  }
  askAll(projectId) {
    const ids2 = Object.keys(this.cfg.projects[projectId]?.accounts ?? {});
    const decisions = ids2.map((id) => this.ask(projectId, id, { record: false }));
    return decisions.sort((a, b) => {
      if (a.verdict !== b.verdict) {
        return a.verdict === "go" ? -1 : b.verdict === "go" ? 1 : 0;
      }
      return (a.retryAfterSec ?? Infinity) - (b.retryAfterSec ?? Infinity);
    });
  }
  syntheticDeny(projectId, accountId, now, summary, remedies) {
    return {
      verdict: "deny",
      policy: "config",
      summary,
      detail: [],
      remedies,
      retryAfterSec: null,
      rulings: [],
      request: { project: projectId, account: accountId, at: now }
    };
  }
  claim(input, opts = {}) {
    const decision2 = this.ask(input.projectId, input.accountId);
    if (decision2.verdict !== "go" && !opts.force)
      return { decision: decision2, claim: null };
    const claim = openClaim(this.db, input, this.clock());
    return { decision: decision2, claim, forced: decision2.verdict !== "go" };
  }
  renew(id) {
    return renewClaim(this.db, id, this.clock());
  }
  release(id) {
    return closeClaim(this.db, id, this.clock());
  }
  countClaims(accountId, projectId) {
    return countClaims(this.db, accountId, projectId);
  }
  async meterAccount(accountId) {
    const now = this.clock();
    const account = this.cfg.accounts[accountId];
    const result = {
      accountId,
      reading: null,
      attributed: {},
      rolled: [],
      uncorroborated: [],
      costEvents: 0,
      error: null
    };
    result.costEvents = this.scanCosts(accountId, now);
    const prev = latestReading(this.db, accountId, now, this.freshness);
    let reading;
    try {
      reading = await this.providerFor(accountId).read(accountId, account, this.ctx(now));
    } catch (e) {
      result.error = e instanceof ProviderError ? `${e.kind}: ${e.message}` : e.message;
      return result;
    }
    if (!reading)
      return result;
    result.reading = reading;
    saveReading(this.db, reading);
    const { synced, uncorroborated } = syncEpochs(this.db, reading, prev, now);
    result.uncorroborated = uncorroborated;
    result.rolled = synced.filter((s) => s.rolled).map((s) => s.kind);
    for (const s of synced) {
      if (s.rolled || !prev)
        continue;
      const before = prev.windows[s.kind];
      const after = reading.windows[s.kind];
      if (!before || !after)
        continue;
      const deltaPct = after.utilizationPct - before.utilizationPct;
      if (!(deltaPct > 0))
        continue;
      const { entries } = attribute(this.db, {
        accountId,
        windowKind: s.kind,
        windowEpochId: s.epochId,
        t0: prev.ts,
        t1: reading.ts,
        deltaPct
      });
      saveAttribution(this.db, entries, prev.ts);
      result.attributed[s.kind] = deltaPct;
    }
    return result;
  }
  async meter() {
    const ids2 = Object.entries(this.cfg.accounts).filter(([, a]) => a.enabled).map(([id]) => id);
    return Promise.all(ids2.map((id) => this.meterAccount(id).catch((e) => ({
      accountId: id,
      reading: null,
      attributed: {},
      rolled: [],
      uncorroborated: [],
      costEvents: 0,
      error: e.message
    }))));
  }
  scanCosts(accountId, now) {
    const account = this.cfg.accounts[accountId];
    let stored = 0;
    for (const source of this.costSources.all()) {
      if (!source.supports(account))
        continue;
      const since = Math.max(0, lastScanMtime(this.db, accountId) - 60);
      const { events: events2, cursors } = source.scan(this.db, accountId, account, since);
      stored += saveCostEvents(this.db, accountId, events2, cursors, (e) => projectForCwd(this.roots, e.cwd), now);
    }
    return stored;
  }
  tick() {
    const now = this.clock();
    const reaped = reapClaims(this.db, now, this.cfg.policy.claim_lease_sec);
    return {
      reaped: reaped.length,
      closedEpochs: closeElapsedEpochs(this.db, now),
      prunedReadings: pruneReadings(this.db, now - 30 * DAY)
    };
  }
  latestReading(accountId) {
    return latestReading(this.db, accountId, this.clock(), this.freshness);
  }
  previousReading(accountId) {
    return previousReading(this.db, accountId, this.clock(), this.freshness);
  }
  facts(projectId, accountId) {
    return buildFacts({
      db: this.db,
      cfg: this.cfg,
      projectId,
      accountId,
      now: this.clock(),
      freshness: this.freshness,
      metered: this.providerFor(accountId).metered
    });
  }
  async doctor() {
    const now = this.clock();
    const out = [];
    for (const [accountId, account] of Object.entries(this.cfg.accounts)) {
      if (!account.enabled)
        continue;
      const problems = [];
      let provider = null;
      try {
        provider = this.providerFor(accountId);
      } catch (e) {
        problems.push(e.message);
      }
      if (provider)
        problems.push(...await provider.check(accountId, account, this.ctx(now)));
      out.push({ accountId, problems });
    }
    return out;
  }
}
// packages/engine/src/views.ts
function accountViews(o) {
  const now = o.clock();
  const out = [];
  for (const [accountId, account] of Object.entries(o.cfg.accounts)) {
    const reading = o.latestReading(accountId);
    const provider = o.providers.find(account.provider);
    const epoch = currentEpoch(o.db, accountId, "seven_day");
    out.push({
      accountId,
      provider: account.provider,
      plan: reading?.plan ?? account.plan ?? null,
      metered: provider?.metered ?? true,
      enabled: account.enabled,
      readingAgeSec: reading ? now - reading.ts : null,
      windows: Object.values(reading?.windows ?? {}).filter((w) => !!w).map((w) => ({
        kind: w.kind,
        utilizationPct: w.utilizationPct,
        resetsAt: w.resetsAt,
        resetsIn: w.resetsAt != null ? humanDuration(w.resetsAt - now) : null,
        windowSec: w.windowSec,
        elapsedPct: w.resetsAt == null ? 0 : elapsedFraction(w.resetsAt, w.windowSec, now) * 100,
        freshness: reading.freshness
      })),
      claims: openClaims(o.db, accountId).length,
      maxConcurrent: account.max_concurrent,
      configDir: account.config_dir ? expandHome(account.config_dir) : null,
      codexHome: account.codex_home ? expandHome(account.codex_home) : null,
      dispatchable: Math.max(0, account.weekly_target_pct - account.interactive_reserve_pct),
      attributed: epoch ? ledgerTotal(o.db, accountId, "seven_day", epoch.id) : 0
    });
  }
  return out;
}
function projectViews(o) {
  const out = [];
  for (const [projectId, project] of Object.entries(o.cfg.projects)) {
    if (!project.enabled)
      continue;
    const accounts = [];
    for (const accountId of Object.keys(project.accounts)) {
      if (!o.cfg.accounts[accountId]?.enabled)
        continue;
      const facts = o.facts(projectId, accountId);
      const decision2 = o.ask(projectId, accountId, { record: false });
      const weekly = facts.windows.find((w) => w.window === "weekly");
      const used = (weekly?.used ?? 0) + (weekly?.staleAdjustment ?? 0);
      const allowance = weekly?.allowance ?? 0;
      const over = used > allowance;
      accounts.push({
        accountId,
        sharePct: facts.shares.weekly * 100,
        alloc: weekly?.alloc ?? 0,
        used,
        allowance,
        elapsedPct: (weekly?.elapsed ?? 0) * 100,
        pace: paceText(paceState(used, allowance, over)),
        over,
        verdict: decision2.verdict,
        retryAfterSec: decision2.retryAfterSec
      });
    }
    out.push({ projectId, accounts });
  }
  return out;
}
function ledgerView(o, accountId, windowKind = GATED_WINDOWS[1]) {
  const epoch = currentEpoch(o.db, accountId, windowKind);
  const reading = o.latestReading(accountId);
  const rows = epoch ? ledgerBreakdown(o.db, accountId, windowKind, epoch.id) : [];
  return {
    accountId,
    windowKind,
    epochId: epoch?.id ?? null,
    vendorPct: reading?.windows[windowKind]?.utilizationPct ?? null,
    attributed: epoch ? ledgerTotal(o.db, accountId, windowKind, epoch.id) : 0,
    rows: rows.map((r) => ({
      projectId: r.projectId,
      pct: r.pct,
      proxy: r.proxy,
      confidencePct: r.entries > 0 ? r.confident / r.entries * 100 : 0
    }))
  };
}
// apps/overton/src/commands/ask.ts
function out(ctx, value, prose) {
  if (ctx.args.flags.json)
    process.stdout.write(JSON.stringify(value, null, 2) + `
`);
  else
    process.stdout.write(prose + `
`);
}
var ask = {
  run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project) {
      process.stderr.write(`usage: overton ask <project> [account]
`);
      return 2;
    }
    if (!account) {
      const all = ctx.overton.askAll(project);
      if (!all.length) {
        process.stderr.write(`${project} names no accounts in config
`);
        return 2;
      }
      out(ctx, all, all.map(renderDecision).join(`

`));
      return EXIT_CODE[all[0].verdict];
    }
    const decision2 = ctx.overton.ask(project, account);
    out(ctx, decision2, renderDecision(decision2));
    return EXIT_CODE[decision2.verdict];
  }
};
var explain2 = {
  run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project || !account) {
      process.stderr.write(`usage: overton explain <project> <account>
`);
      return 2;
    }
    const facts2 = ctx.overton.facts(project, account);
    const decision2 = ctx.overton.ask(project, account, { record: false });
    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify({ decision: decision2, facts: facts2 }, null, 2) + `
`);
      return 0;
    }
    const lines = [
      renderDecision(decision2),
      "",
      `account      ${facts2.accountId}  provider ${facts2.reading?.provider ?? "?"}  ` + `${facts2.metered ? "metered" : "unmetered"}`,
      `reading      ${facts2.reading ? `${facts2.reading.freshness}, ts ${facts2.reading.ts}` : "none"}`,
      `claims       ${facts2.claims.project} by this project, ${facts2.claims.account} on the account ` + `(max ${facts2.account.max_concurrent})`,
      `shares       weekly ${(facts2.shares.weekly * 100).toFixed(0)}%  ` + `5h ${(facts2.shares.fiveHour * 100).toFixed(0)}%`,
      ""
    ];
    for (const w of facts2.windows) {
      lines.push(`${w.window}  mode ${w.mode}  ${w.reported ? `${w.reading?.utilizationPct.toFixed(0)}% account-wide` : "not reported by vendor"}`, `  alloc ${w.alloc.toFixed(2)} pts \xB7 used ${w.used.toFixed(2)} \xB7 allowance ${w.allowance.toFixed(2)} \xB7 ` + `elapsed ${(w.elapsed * 100).toFixed(0)}%`, `  freshness ${w.freshness}${w.staleAdjustment ? ` \xB7 stale adjustment +${w.staleAdjustment.toFixed(2)} pts` : ""}` + `${w.blocked ? ` \xB7 BLOCKED: ${w.blocked}` : ""}`);
    }
    lines.push("", "rulings");
    for (const r of decision2.rulings)
      lines.push(`  ${r.policy.padEnd(16)} ${r.verdict}  ${r.summary}`);
    if (!decision2.rulings.length)
      lines.push("  (every policy had no opinion \u2014 nothing stood in the way)");
    process.stdout.write(lines.join(`
`) + `
`);
    return 0;
  }
};
var claim = {
  run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project || !account) {
      process.stderr.write(`usage: overton claim <project> <account> [--label X] [--force]
`);
      return 2;
    }
    const res = ctx.overton.claim({
      projectId: project,
      accountId: account,
      label: typeof ctx.args.flags.label === "string" ? ctx.args.flags.label : null,
      pid: process.ppid
    }, { force: ctx.args.flags.force === true });
    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify(res, null, 2) + `
`);
    } else if (res.claim) {
      process.stdout.write(`${res.claim.id}
` + (res.forced ? `  FORCED past: ${res.decision.summary}
` : ""));
    } else {
      process.stdout.write(renderDecision(res.decision) + `
`);
    }
    return res.claim ? 0 : EXIT_CODE[res.decision.verdict];
  }
};
var renew = {
  run(ctx) {
    const [id] = ctx.args.positional;
    if (!id) {
      process.stderr.write(`usage: overton renew <claim-id>
`);
      return 2;
    }
    if (ctx.overton.renew(id))
      return 0;
    process.stderr.write(`no open claim \`${id}\` \u2014 it may have been reaped
`);
    return 1;
  }
};
var release = {
  run(ctx) {
    const [id] = ctx.args.positional;
    if (!id) {
      process.stderr.write(`usage: overton release <claim-id>
`);
      return 2;
    }
    if (ctx.overton.release(id))
      return 0;
    process.stderr.write(`no open claim \`${id}\`
`);
    return 1;
  }
};
var run = {
  async run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project || !account || ctx.args.rest.length === 0) {
      process.stderr.write(`usage: overton run <project> <account> -- <command>...
`);
      return 2;
    }
    const res = ctx.overton.claim({ projectId: project, accountId: account, label: ctx.args.rest.join(" ").slice(0, 120), pid: process.pid }, { force: ctx.args.flags.force === true });
    if (!res.claim) {
      process.stderr.write(renderDecision(res.decision) + `
`);
      return EXIT_CODE[res.decision.verdict];
    }
    const leaseSec = ctx.overton.cfg.policy.claim_lease_sec;
    const beat = setInterval(() => ctx.overton.renew(res.claim.id), Math.max(5, leaseSec / 3) * 1000);
    try {
      const proc = Bun.spawn(ctx.args.rest, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
      return await proc.exited;
    } finally {
      clearInterval(beat);
      ctx.overton.release(res.claim.id);
    }
  }
};
var askCommands = { ask, explain: explain2, claim, renew, release, run };

// apps/overton/src/render.ts
function renderStatus(accounts, projects) {
  const acct = table(["ACCOUNT", "PROVIDER", "PLAN", "7d", "5h", "READING", "CLAIMS"], accounts.map((a) => {
    const w7 = a.windows.find((w) => w.kind === "seven_day");
    const w5 = a.windows.find((w) => w.kind === "five_hour");
    return [
      a.accountId + (a.enabled ? "" : " (off)"),
      a.provider,
      a.plan ?? "\u2014",
      w7 ? `${bar(w7.utilizationPct)} ${w7.utilizationPct.toFixed(0)}%` : a.metered ? "\u2014" : "unmetered",
      w5 ? `${w5.utilizationPct.toFixed(0)}%` : "\u2014",
      a.readingAgeSec == null ? "never" : `${humanDuration(a.readingAgeSec)} ago`,
      `${a.claims}/${a.maxConcurrent}`
    ];
  }));
  const rows = [];
  for (const p of projects) {
    for (const a of p.accounts) {
      rows.push([
        p.projectId,
        a.accountId,
        `${a.sharePct.toFixed(0)}%`,
        `${a.used.toFixed(1)}/${a.allowance.toFixed(1)}`,
        a.pace,
        a.verdict + (a.retryAfterSec ? ` ${humanDuration(a.retryAfterSec)}` : "")
      ]);
    }
  }
  const proj = table(["PROJECT", "ACCOUNT", "SHARE", "USED/ALLOWED", "PACE", "VERDICT"], rows);
  return `${acct}

${proj}`;
}
function renderWindows(accounts) {
  const rows = [];
  for (const a of accounts) {
    if (!a.windows.length) {
      rows.push([a.accountId, a.metered ? "(no reading)" : "unmetered", "", "", ""]);
      continue;
    }
    for (const w of a.windows) {
      rows.push([
        a.accountId,
        w.kind,
        `${bar(w.utilizationPct)} ${w.utilizationPct.toFixed(1)}%`,
        w.resetsIn ? `in ${w.resetsIn}` : "unknown",
        w.freshness
      ]);
    }
  }
  return table(["ACCOUNT", "WINDOW", "USED", "RESETS", "FRESHNESS"], rows);
}
function renderProjects(views2) {
  const rows = [];
  for (const p of views2) {
    for (const a of p.accounts) {
      rows.push([
        p.projectId,
        a.accountId,
        `${a.sharePct.toFixed(0)}%`,
        a.alloc.toFixed(1),
        a.used.toFixed(1),
        a.allowance.toFixed(1),
        `${a.elapsedPct.toFixed(0)}%`,
        a.pace
      ]);
    }
  }
  return table(["PROJECT", "ACCOUNT", "SHARE", "ALLOC", "USED", "ALLOWED", "ELAPSED", "PACE"], rows);
}
function renderLedger(view) {
  const rows = view.rows.map((r) => [
    r.projectId,
    `${r.pct.toFixed(2)} pts`,
    r.proxy.toLocaleString(),
    `${r.confidencePct.toFixed(0)}%`
  ]);
  const body = table(["PROJECT", "ATTRIBUTED", "OUTPUT TOKENS", "CONFIDENCE"], rows);
  const gap = view.vendorPct != null ? `

vendor says ${view.vendorPct.toFixed(1)}% \xB7 attributed ${view.attributed.toFixed(1)} pts` + `
  the difference is spend from before this epoch was first observed, or from a source ` + `Overton cannot see` : "";
  return `${view.accountId} \xB7 ${view.windowKind} \xB7 epoch ${view.epochId ?? "none"}

${body}${gap}`;
}
function renderClaims(claims2, now) {
  if (!claims2.length)
    return "no open claims";
  return table(["CLAIM", "PROJECT", "ACCOUNT", "AGE", "LAST BEAT", "LABEL"], claims2.map((c) => [
    c.id,
    c.projectId,
    c.accountId,
    humanDuration(now - c.openedAt),
    humanDuration(now - c.heartbeatAt) + " ago",
    c.label ?? ""
  ]));
}
function renderSplit(views2, edited) {
  const rows = [];
  for (const p of views2) {
    for (const a of p.accounts) {
      rows.push([
        p.projectId === edited ? `${p.projectId} *` : p.projectId,
        a.accountId,
        `${a.sharePct.toFixed(0)}%`,
        a.alloc.toFixed(1),
        a.pace
      ]);
    }
  }
  return table(["PROJECT", "ACCOUNT", "SHARE", "ALLOC", "PACE"], rows);
}

// apps/overton/src/commands/look.ts
function emit(ctx, value, prose) {
  if (ctx.args.flags.json)
    process.stdout.write(JSON.stringify(value, null, 2) + `
`);
  else
    process.stdout.write(prose() + `
`);
  return 0;
}
var status = {
  run(ctx) {
    const accounts = accountViews(ctx.overton);
    const projects = projectViews(ctx.overton);
    return emit(ctx, { accounts, projects }, () => renderStatus(accounts, projects));
  }
};
var windows = {
  run(ctx) {
    const [only] = ctx.args.positional;
    const accounts = accountViews(ctx.overton).filter((a) => !only || a.accountId === only);
    return emit(ctx, accounts, () => renderWindows(accounts));
  }
};
var projects = {
  run(ctx) {
    const views2 = projectViews(ctx.overton);
    return emit(ctx, views2, () => renderProjects(views2));
  }
};
var ledger = {
  run(ctx) {
    const [account] = ctx.args.positional;
    if (!account) {
      process.stderr.write(`usage: overton ledger <account> [--window seven_day|five_hour]
`);
      return 2;
    }
    const window = typeof ctx.args.flags.window === "string" ? ctx.args.flags.window : undefined;
    const view = ledgerView(ctx.overton, account, window);
    return emit(ctx, view, () => renderLedger(view));
  }
};
var claims2 = {
  run(ctx) {
    const account = typeof ctx.args.flags.account === "string" ? ctx.args.flags.account : undefined;
    const rows = openClaims(ctx.overton.db, account);
    const now = ctx.overton.clock();
    return emit(ctx, rows, () => renderClaims(rows, now));
  }
};
var plugins = {
  run(ctx) {
    const o = ctx.overton;
    const value = {
      providers: o.providers.all().map((p) => ({ id: p.id, description: p.description, metered: p.metered })),
      costSources: o.costSources.all().map((s) => ({ id: s.id, description: s.description })),
      policies: o.policies.all().map((p) => ({ id: p.id, description: p.description })),
      chain: o.cfg.policy.chain
    };
    return emit(ctx, value, () => {
      const section = (title, rows) => `${title}
${table(["ID", "DESCRIPTION"], rows)}`;
      return [
        section("PROVIDERS", value.providers.map((p) => [p.id + (p.metered ? "" : " (unmetered)"), p.description])),
        section("COST SOURCES", value.costSources.map((s) => [s.id, s.description])),
        section("POLICIES", value.policies.map((p) => [
          p.id + (value.chain.includes(p.id) ? " *" : ""),
          p.description
        ])),
        `
* = in the active chain, which runs: ${value.chain.join(" \u2192 ")}`,
        `  (every policy rules; the worst verdict wins, so order affects only which is reported)`
      ].join(`

`);
    });
  }
};
var lookCommands = {
  status,
  windows,
  projects,
  ledger,
  claims: claims2,
  plugins
};

// apps/overton/src/commands/ops.ts
import { mkdirSync, existsSync, writeFileSync as writeFileSync2 } from "fs";
import { dirname as dirname2 } from "path";
import { statSync as statSync4 } from "fs";

// packages/server/src/config-api.ts
function json(body, status2 = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status: status2,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
function num(v) {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
async function edit(o, apply) {
  if (!o.configFile) {
    return json({ error: "this Overton was started without a config file, so it cannot edit one" }, 409);
  }
  let cfg;
  try {
    const cd = loadConfigDoc(o.configFile);
    apply(cd);
    cfg = saveConfigDoc(cd);
  } catch (e) {
    return json({ error: e instanceof ConfigError ? e.message : e.message }, 400);
  }
  const next = new Overton({ db: o.db, cfg, configFile: o.configFile, clock: o.clock });
  return json({ ok: true, projects: projectViews(next) });
}
async function handleConfig(o, req, path) {
  if (!path.startsWith("/v1/config"))
    return null;
  if (req.method === "GET" && path === "/v1/config") {
    return json({
      file: o.configFile,
      accounts: o.cfg.accounts,
      projects: o.cfg.projects,
      policy: o.cfg.policy
    });
  }
  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
  let m = /^\/v1\/config\/projects\/([^/]+)\/accounts\/([^/]+)$/.exec(path);
  if (m) {
    const [, project, account] = m.map(decodeURIComponent);
    if (req.method === "DELETE")
      return edit(o, (cd) => revokeAccount(cd, project, account));
    if (req.method === "PUT") {
      const weight = num(body.weight);
      if (weight == null || weight < 0)
        return json({ error: "`weight` must be a number >= 0" }, 400);
      return edit(o, (cd) => setShare(cd, project, account, weight));
    }
  }
  if (req.method === "POST" && path === "/v1/config/projects") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id)
      return json({ error: "`id` is required" }, 400);
    const roots = Array.isArray(body.roots) ? body.roots.filter((r) => typeof r === "string") : [];
    const accounts = {};
    if (body.accounts && typeof body.accounts === "object") {
      for (const [k, v] of Object.entries(body.accounts)) {
        const w = num(v);
        if (w != null && w >= 0)
          accounts[k] = w;
      }
    }
    return edit(o, (cd) => addProject(cd, { id, roots, accounts }));
  }
  m = /^\/v1\/config\/projects\/([^/]+)$/.exec(path);
  if (m) {
    const project = decodeURIComponent(m[1]);
    if (req.method === "DELETE")
      return edit(o, (cd) => removeProject(cd, project));
    if (req.method === "PATCH") {
      return edit(o, (cd) => {
        if (Array.isArray(body.roots)) {
          setProjectRoots(cd, project, body.roots.filter((r) => typeof r === "string"));
        }
        if (typeof body.enabled === "boolean")
          setProjectEnabled(cd, project, body.enabled);
      });
    }
  }
  m = /^\/v1\/config\/accounts\/([^/]+)$/.exec(path);
  if (m && req.method === "PATCH") {
    const account = decodeURIComponent(m[1]);
    const updates = [];
    for (const field of ACCOUNT_FIELDS) {
      if (!(field in body))
        continue;
      const v = num(body[field]);
      if (v == null)
        return json({ error: `\`${field}\` must be a number` }, 400);
      updates.push([field, v]);
    }
    if (!updates.length)
      return json({ error: `nothing to change \u2014 send one of ${ACCOUNT_FIELDS.join(", ")}` }, 400);
    return edit(o, (cd) => {
      for (const [field, value] of updates)
        setAccountField(cd, account, field, value);
    });
  }
  return json({ error: `no config route for ${req.method} ${path}` }, 404);
}

// packages/server/src/ui.ts
var STYLE = `
/* Tokens. Every colour is declared here on bare :root and only REDEFINED in the
   dark block, so no value exists solely inside a media query. Semantic colour
   (ok / warn / bad) is deliberately nowhere near the accent: the accent is data
   ink and focus, the semantics are state, and a page where the brand colour also
   means "fine" cannot say "fine" about anything else. Every state also carries a
   mark and a word, so none of it depends on hue. */
:root {
  color-scheme: light dark;

  --paper:    #F2F4F6;
  --panel:    #FFFFFF;
  --panel-2:  #F8FAFB;
  --ink:      #12171C;
  --ink-2:    #57636F;
  /* Tertiary, not decorative: roots, projections and the policy chain all live
     here, so it clears 4.5:1 on the lightest ground rather than fading out. */
  --ink-3:    #626C78;
  --rule:     #DCE2E8;
  --rule-2:   #EAEEF2;
  --track:    #EDF1F4;
  --tick:     #D3DBE3;

  --accent:     #1F5F8B;
  --accent-ink: #FFFFFF;
  /* The hand is ink, not a hue: it is the clock, and the clock is not a state. */
  --clock:      #12171C;

  --ok:    #1B7A4B; --ok-bg:   #E3F1E9; --ok-line:   #A9D6BF;
  --warn:  #8A5800; --warn-bg: #FAEFD8; --warn-line: #E3C68A;
  --bad:   #B2311B; --bad-bg:  #FAE5E1; --bad-line:  #EAAE9F;
  --mute:  #57636F; --mute-bg: #EEF1F4; --mute-line: #D5DCE3;

  --ui:  system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --num: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper:    #0D1117;
    --panel:    #141A21;
    --panel-2:  #182029;
    --ink:      #E6EDF3;
    --ink-2:    #97A5B4;
    --ink-3:    #8593A2;
    --rule:     #242D37;
    --rule-2:   #1D252D;
    --track:    #1B222A;
    --tick:     #2B3540;

    --accent:     #6FB3DE;
    --accent-ink: #0D1117;
    --clock:      #E6EDF3;

    --ok:    #56C08D; --ok-bg:   #10261C; --ok-line:   #23503B;
    --warn:  #E0A94A; --warn-bg: #2A2110; --warn-line: #54421A;
    --bad:   #FF7A5C; --bad-bg:  #2E1512; --bad-line:  #5C2A20;
    --mute:  #97A5B4; --mute-bg: #1D252D; --mute-line: #2B3540;
  }
}

.t-ok   { --tone: var(--ok);   --tone-bg: var(--ok-bg);   --tone-line: var(--ok-line); }
.t-warn { --tone: var(--warn); --tone-bg: var(--warn-bg); --tone-line: var(--warn-line); }
.t-bad  { --tone: var(--bad);  --tone-bg: var(--bad-bg);  --tone-line: var(--bad-line); }
.t-mute { --tone: var(--mute); --tone-bg: var(--mute-bg); --tone-line: var(--mute-line); }

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--ui);
  font-size: 14px;
  line-height: 1.5;
  /* The page may never scroll sideways; wide things scroll inside themselves. */
  overflow-x: hidden;
}
.wrap { max-width: 1180px; margin: 0 auto; padding: 26px 20px 80px; }
/* Everywhere a figure sits above or beside another one and has to be compared
   by eye rather than read as a word. */
table, input, .tile-v, .win-meta, .card-foot, .alert-what, .stamp, .sub,
.mix, .diff, .dial-v, .cap-key {
  font-variant-numeric: tabular-nums;
}

/* masthead ---------------------------------------------------------------- */
.mast { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.mark { font-family: var(--num); font-size: 19px; font-weight: 600; letter-spacing: -.02em; margin: 0; }
.tag { color: var(--ink-2); font-size: 12.5px; }
.mast-r { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.stamp { font-family: var(--num); font-size: 11.5px; color: var(--ink-2); }
.mast-sub {
  font-family: var(--num); font-size: 11.5px; color: var(--ink-3);
  margin-top: 4px; overflow-wrap: anywhere;
}

/* sections ---------------------------------------------------------------- */
section { margin-top: 26px; }
h2 {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em;
  color: var(--ink-2); font-weight: 600; margin: 0 0 9px;
  display: flex; align-items: center; gap: 10px;
}
h2::after { content: ""; flex: 1; height: 1px; background: var(--rule); }
h2 .h2-note { text-transform: none; letter-spacing: 0; color: var(--ink-3); font-weight: 400; }
.panel { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; }
.note { color: var(--ink-2); font-size: 12px; margin: 8px 2px 0; max-width: 78ch; }
.note code, code { font-family: var(--num); font-size: .95em; color: var(--ink); }
.empty { padding: 18px 14px; color: var(--ink-2); font-size: 12.5px; }

/* the strip of headline figures ------------------------------------------- */
.tiles {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: 4px;
  overflow: hidden;
}
.tile { background: var(--panel); padding: 11px 14px 12px; }
.tile-k {
  font-size: 10px; text-transform: uppercase; letter-spacing: .12em;
  color: var(--ink-2); font-weight: 600;
}
.tile-v {
  font-family: var(--num); font-size: 26px; line-height: 1.15; letter-spacing: -.02em;
  margin-top: 5px; display: flex; align-items: baseline; gap: 7px;
}
.tile-v .mk { font-size: 16px; color: var(--tone); }
.tile.flag .tile-v { color: var(--tone); }
.tile-s { color: var(--ink-2); font-size: 11.5px; margin-top: 3px; }

/* what needs attention ---------------------------------------------------- */
.alerts { list-style: none; margin: 10px 0 0; padding: 0; border: 1px solid var(--rule); border-radius: 4px; }
.alert {
  display: grid; grid-template-columns: 14px minmax(0, auto) minmax(0, 1fr) auto;
  gap: 4px 12px; align-items: baseline;
  padding: 9px 13px; background: var(--panel); border-bottom: 1px solid var(--rule-2);
  border-left: 3px solid var(--tone);
}
.alert:first-child { border-radius: 3px 3px 0 0; }
.alert:last-child { border-bottom: 0; border-radius: 0 0 3px 3px; }
.alert .mk { color: var(--tone); font-family: var(--num); font-weight: 700; }
.alert-who { font-family: var(--num); font-size: 12.5px; }
.alert-who .arrow { color: var(--ink-3); }
.alert-what { color: var(--ink-2); font-size: 12px; font-family: var(--num); }
.alert-what .lead { color: var(--tone); font-weight: 600; }
.all-clear {
  display: flex; align-items: baseline; gap: 8px; margin-top: 10px;
  padding: 9px 13px; border: 1px solid var(--rule); border-radius: 4px;
  background: var(--panel); color: var(--ink-2); font-size: 12.5px;
}
.all-clear .mk { color: var(--ok); font-family: var(--num); font-weight: 700; }

/* accounts ---------------------------------------------------------------- */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(370px, 1fr)); gap: 12px; }
@media (max-width: 800px) { .cards { grid-template-columns: 1fr; } }
.card { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 12px 14px 11px; }
/* The stripe is signal, so only a card that wants attention gets one. A rule
   drawn on every card is decoration and stops meaning anything. */
.card.flag { border-left: 3px solid var(--tone); padding-left: 12px; }
.card-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 2px; }
.card-name { font-family: var(--num); font-size: 14px; font-weight: 600; }
.card-head .spacer { margin-left: auto; }
.chip {
  font-size: 10px; text-transform: uppercase; letter-spacing: .09em;
  color: var(--ink-2); border: 1px solid var(--rule); border-radius: 2px; padding: 1px 5px;
  white-space: nowrap;
}
.pill {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 10.5px; letter-spacing: .04em; white-space: nowrap;
  color: var(--tone); background: var(--tone-bg);
  border: 1px solid var(--tone-line); border-radius: 2px; padding: 1px 5px;
}
.pill .mk { font-family: var(--num); font-weight: 700; }
.card-foot {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--rule-2);
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-family: var(--num); font-size: 11px; color: var(--ink-2);
}
.card-foot .spacer { margin-left: auto; }

/* one window: a label, a rule, and the two numbers that make it mean something */
.win { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 2px 10px; margin-top: 9px; }
.win-k { grid-row: 1 / span 2; font-family: var(--num); font-size: 11px; color: var(--ink-2); padding-top: 7px; }
.win-meta {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-family: var(--num); font-size: 11px; color: var(--ink-2);
}
.win-meta .spacer { margin-left: auto; }
.win-meta b { color: var(--ink); font-weight: 600; }

/* THE PACE RULE ----------------------------------------------------------- */
.meter { position: relative; padding-top: 5px; }
.track {
  position: relative; height: 15px; overflow: hidden;
  background-color: var(--track); border: 1px solid var(--rule); border-radius: 2px;
  /* Decile ticks, so a bar can be read to ~5% without looking at the number. */
  background-image: linear-gradient(90deg, var(--tick) 0 1px, transparent 1px);
  background-size: 10% 100%;
}
/* CLIPPED, not scaled and not resized. Scaling shears the hatch on an over-pace
   fill, and the hatch is the half of that encoding which survives
   colourblindness, so it has to keep its angle. Clipping a full-width element
   leaves the stripes alone and moves no layout \u2014 there can be thirty of these
   settling at once. */
.fill {
  position: absolute; inset: 0; background: var(--accent);
  clip-path: inset(0 calc((1 - var(--v, 0)) * 100%) 0 0);
  transition: clip-path .5s cubic-bezier(.22,.61,.36,1);
}
.fill.over {
  background-color: var(--bad);
  background-image: repeating-linear-gradient(
    135deg, rgba(255,255,255,.30) 0 3px, rgba(255,255,255,0) 3px 7px);
}
/* The hand: where the clock says this ought to be by now. */
.hand {
  position: absolute; top: 0; bottom: 0; left: var(--at, 0%);
  width: 2px; margin-left: -1px; background: var(--clock);
}
.hand::before {
  content: ""; position: absolute; top: 0; left: -3px;
  border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-top: 5px solid var(--clock);
}
/* The account's own stop, which no project's share can spend past. */
.stop {
  position: absolute; top: 5px; bottom: 0; left: var(--at, 0%); width: 1px;
  background: repeating-linear-gradient(180deg, var(--ink-2) 0 2px, transparent 2px 5px);
}
.spill {
  position: absolute; right: 2px; top: 6px; font-family: var(--num); font-size: 11px;
  color: var(--bad); line-height: 15px;
}
@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }

/* tables ------------------------------------------------------------------ */
.tablewrap { overflow-x: auto; }
table.grid { width: 100%; border-collapse: collapse; min-width: 720px; }
table.grid th {
  font-size: 10px; text-transform: uppercase; letter-spacing: .1em;
  color: var(--ink-2); font-weight: 600; text-align: left;
  padding: 7px 10px; border-bottom: 1px solid var(--rule); white-space: nowrap;
  background: var(--panel-2);
}
table.grid td { padding: 8px 10px; border-bottom: 1px solid var(--rule-2); vertical-align: middle; }
table.grid tr:last-child td { border-bottom: 0; }
table.grid td.n, table.grid th.n { text-align: right; font-family: var(--num); font-size: 12px; }
table.grid td.mono { font-family: var(--num); font-size: 12px; }
.sub { color: var(--ink-3); font-size: 11px; font-family: var(--num); }

.grp th {
  background: var(--panel-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule-2);
  text-transform: none; letter-spacing: 0; padding: 8px 10px;
}
.grp-in { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.grp-name { font-family: var(--num); font-size: 13px; font-weight: 600; color: var(--ink); }
.grp-in .spacer { margin-left: auto; }
.acct-cell { font-family: var(--num); font-size: 12px; }

/* the decision, fetched on demand ----------------------------------------- */
.why { background: var(--panel-2); }
.why-in { padding: 4px 2px 8px; }
.why-head { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; margin-bottom: 6px; }
.why-sum { font-size: 12.5px; }
.why-head .spacer { margin-left: auto; }
.why pre {
  margin: 0; font-family: var(--num); font-size: 11.5px; color: var(--ink-2);
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.why ul { margin: 7px 0 0; padding-left: 0; list-style: none; }
.why li { font-family: var(--num); font-size: 11.5px; color: var(--ink-2); padding: 1px 0; }
.why li::before { content: "\\2192  "; color: var(--accent); }
.why .rulings { margin-top: 8px; font-family: var(--num); font-size: 11px; color: var(--ink-3); }
.why .rulings div { padding: 1px 0; }

/* controls ---------------------------------------------------------------- */
input[type=number], input[type=text] {
  font-family: var(--num); font-size: 12px; color: var(--ink);
  background: var(--panel); border: 1px solid var(--rule); border-radius: 2px;
  padding: 4px 6px; width: 70px; text-align: right;
}
input[type=text] { text-align: left; width: 100%; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-radius: 2px; }
button {
  font-family: var(--ui); font-size: 11.5px; letter-spacing: .02em;
  color: var(--ink); background: var(--panel);
  border: 1px solid var(--rule); border-radius: 2px; padding: 4px 9px; cursor: pointer;
}
button:hover { border-color: var(--accent); color: var(--accent); }
button.quiet { border-color: transparent; background: transparent; color: var(--ink-2); padding: 2px 5px; }
button.quiet:hover { color: var(--accent); border-color: var(--rule); }
button.danger:hover { border-color: var(--bad); color: var(--bad); }
button.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
button.primary:hover { color: var(--accent-ink); opacity: .9; }
button[aria-expanded=true] { border-color: var(--accent); color: var(--accent); }

.add { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(200px, 2fr) auto; gap: 10px; align-items: end; padding: 12px 14px; }
.add label, .dial label, .field label {
  display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .11em;
  color: var(--ink-2); margin-bottom: 4px;
}

/* THE SPLIT --------------------------------------------------------------- */
/* One panel per account, because the thing being divided is an account. A
   project-major table can show a share; it cannot show that the shares on one
   account are a single quantity being shared out, which is the fact the whole
   section exists to make obvious. */
.mixers { display: grid; gap: 12px; }
.mix { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 12px 14px 12px; }
.mix.flag { border-left: 3px solid var(--tone); padding-left: 12px; }
.mix-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.mix-name { font-family: var(--num); font-size: 14px; font-weight: 600; }
.mix-head .spacer { margin-left: auto; }
.mix-disp { font-family: var(--num); font-size: 11.5px; color: var(--ink-2); margin-top: 3px; }
.mix-disp b { color: var(--ink); font-size: 13px; }
.mix-note { color: var(--ink-3); font-size: 11.5px; margin: 7px 0 0; }

/* Where all hundred points of the week go, drawn at the same scale as the pace
   rule above it: the projects' slices, the capacity held back for a person, and
   the headroom above the account's own stop that nobody may spend. */
.cap {
  display: flex; height: 18px; margin: 10px 0 5px; overflow: hidden;
  background: var(--track); border: 1px solid var(--rule); border-radius: 2px;
}
/* The 2px divider is what actually separates one slice from the next, and it is
   panel against accent, so the boundary survives any hue. The alternating tint
   is a nicety on top of it, and which slice belongs to which project is answered
   by lighting it from the row \u2014 never by asking anyone to match two colours. */
.seg { flex: 0 0 auto; min-width: 0; box-shadow: inset -2px 0 0 var(--panel); }
.seg:last-child { box-shadow: none; }
.seg.p { background: var(--accent); }
.seg.alt { background: var(--accent); background: color-mix(in srgb, var(--accent) 45%, var(--panel)); }
.seg.res {
  background: var(--panel-2);
  background-image: repeating-linear-gradient(135deg, var(--tick) 0 3px, transparent 3px 7px);
}
/* Dispatchable and claimed by nobody. Only ever wide when no project names the
   account or every one of them is at 0, and in both cases it must not look like
   the headroom above the stop \u2014 those are opposite facts. */
.seg.free { background: var(--track); box-shadow: inset 0 0 0 1px var(--mute-line), inset -2px 0 0 var(--panel); }
.seg.head { background: var(--track); }
.seg.lit { outline: 2px solid var(--clock); outline-offset: -2px; }
.cap-key { display: flex; flex-wrap: wrap; gap: 2px 15px; font-size: 11px; color: var(--ink-2); }
.cap-key i {
  display: inline-block; width: 9px; height: 9px; margin-right: 5px; vertical-align: -1px;
  border: 1px solid var(--rule); border-radius: 1px; font-style: normal;
}
.cap-key i.k-p { background: var(--accent); }
.cap-key i.k-res {
  background: var(--panel-2);
  background-image: repeating-linear-gradient(135deg, var(--tick) 0 3px, transparent 3px 7px);
}
.cap-key i.k-head { background: var(--track); }
.cap-key i.k-free { background: var(--track); box-shadow: inset 0 0 0 1px var(--mute-line); }

.dials {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px 20px;
  margin-top: 10px; padding: 10px 0; border-top: 1px solid var(--rule-2); border-bottom: 1px solid var(--rule-2);
}
.dial-in { display: flex; align-items: center; gap: 10px; }
.dial-v { font-family: var(--num); font-size: 12px; min-width: 3.6em; text-align: right; }
.dial-why { font-size: 11px; color: var(--ink-3); margin-top: 3px; }

.mixrow {
  display: grid; grid-template-columns: minmax(110px, 1.05fr) minmax(120px, 2.3fr) auto auto;
  gap: 3px 12px; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--rule-2);
}
.mixrow:last-of-type { border-bottom: 0; }
.mixrow-name { font-size: 12.5px; overflow-wrap: anywhere; display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
.mixrow-name b { font-family: var(--num); font-weight: 600; }
.mixrow-num { font-family: var(--num); font-size: 12px; text-align: right; white-space: nowrap; min-width: 6.6em; }
.mixrow-num b { font-size: 13px; font-weight: 600; }
.mixrow-num .sub { display: block; }
/* A zero is a denial somebody typed, not a very small share, and the gate
   answers "deny" for it. It gets the word and the tone that says so. */
.mixrow.zero .mixrow-num b { color: var(--bad); }
.mixrow.gone { opacity: .6; }
.mixrow.gone .mixrow-name b { text-decoration: line-through; }
.mix-more { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; padding-top: 9px; font-size: 11.5px; color: var(--ink-3); }

input[type=range] {
  -webkit-appearance: none; appearance: none; -moz-appearance: none;
  width: 100%; height: 20px; margin: 0; padding: 0; background: transparent; cursor: pointer;
  accent-color: var(--accent);
}
/* The filled portion is a gradient driven by --v, and --v is written in the one
   place that writes .value, so the paint and the number beside it cannot drift. */
input[type=range]::-webkit-slider-runnable-track {
  height: 6px; border-radius: 3px; border: 1px solid var(--rule);
  background: linear-gradient(90deg,
    var(--accent) 0 calc(var(--v, 0) * 100%), var(--track) calc(var(--v, 0) * 100%) 100%);
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 15px; height: 15px; margin-top: -5.5px; border-radius: 50%;
  background: var(--panel); border: 2px solid var(--accent);
}
input[type=range]::-moz-range-track { height: 6px; border-radius: 3px; border: 1px solid var(--rule); background: var(--track); }
input[type=range]::-moz-range-progress { height: 6px; border-radius: 3px 0 0 3px; background: var(--accent); }
input[type=range]::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: var(--panel); border: 2px solid var(--accent); }
input[type=range]:disabled { cursor: not-allowed; opacity: .5; }

/* Nothing is written until this appears and someone reads it. */
.pending {
  margin-top: 11px; padding: 9px 11px; border-radius: 3px;
  border: 1px solid var(--warn-line); background: var(--warn-bg);
}
.pending-h { font-size: 11.5px; color: var(--warn); font-weight: 600; }
.pending-w { font-size: 11.5px; color: var(--ink-2); margin-top: 3px; }
.diff { font-size: 11.5px; color: var(--ink-2); margin-top: 6px; }
.diff div { display: flex; align-items: baseline; gap: 8px; padding: 1px 0; }
.diff .who { min-width: 11ch; color: var(--ink); }
.diff .mk { color: var(--ink-3); }
.diff b { color: var(--ink); font-weight: 600; }
.pending-act { display: flex; gap: 8px; margin-top: 9px; align-items: center; flex-wrap: wrap; }

.field { padding: 9px 0 2px; }
.field-in { display: flex; gap: 8px; align-items: center; }
.grp .field label { margin-bottom: 3px; }

/* legend and footer ------------------------------------------------------- */
.legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 9px 2px 0; }
.legend span.item { font-size: 11.5px; color: var(--ink-2); }
.legend .mk { font-family: var(--num); font-weight: 700; color: var(--tone); }
.foot {
  margin-top: 30px; padding-top: 12px; border-top: 1px solid var(--rule);
  color: var(--ink-3); font-size: 11.5px;
}
.foot .chain { font-family: var(--num); color: var(--ink-2); }

#flash {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
  background: var(--ink); color: var(--paper); font-family: var(--num); font-size: 12px;
  padding: 8px 14px; border-radius: 3px; opacity: 0; pointer-events: none;
  transition: opacity .2s; max-width: 90vw; z-index: 9;
}
#flash.show { opacity: 1; }
/* --paper, not white: the dark palette's --bad is a light salmon, and white on
   it is unreadable. The ground colour inverts correctly in both themes. */
#flash.bad { background: var(--bad); color: var(--paper); }
@media (prefers-reduced-motion: reduce) { #flash { transition: none; } }

@media (max-width: 720px) {
  .add { grid-template-columns: 1fr; }
  .alert { grid-template-columns: 14px minmax(0, 1fr); }
  .alert .alert-act { grid-column: 2; justify-self: start; }
  /* The slider needs a whole line before it needs a neighbour: a 90px track is
     not a control anyone can aim at. */
  .mixrow { grid-template-columns: minmax(0, 1fr) auto auto; }
  .mixrow-slider { grid-column: 1 / -1; order: 3; }
  /* The table still scrolls in its own box; dropping the two columns a phone
     can least use just shortens how far. */
  .hide-sm { display: none; }
  table.grid { min-width: 540px; }
}
`;
var SCRIPT = String.raw`
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp01 = (n) => (isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const pts = (n) => (n == null || !isFinite(n) ? "\u2014" : n.toFixed(1));
const pct = (n) => (n == null || !isFinite(n) ? "\u2014" : n.toFixed(0) + "%");

/* Mirrors humanDuration in the core. The deck and the CLI describing the same
   backoff differently is a bug report waiting to happen. */
function dur(sec) {
  if (sec == null || !isFinite(sec)) return "\u2014";
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return s + "s";
  const mins = Math.round(s / 60);
  if (mins < 60) return mins + "m";
  if (mins < 1440) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? h + "h" + m + "m" : h + "h";
  }
  const hours = Math.round(mins / 60), d = Math.floor(hours / 24), h = hours % 24;
  return h ? d + "d" + h + "h" : d + "d";
}

/* Window kinds are open-ended \u2014 a provider may report a monthly one \u2014 so an
   unrecognised kind is shown as itself rather than dropped. */
function winLabel(kind) {
  return kind === "seven_day" ? "7d" : kind === "five_hour" ? "5h" : String(kind);
}

/* Every state carries a MARK as well as a colour. Four marks, one alphabet:
   usable, degraded, needs a person, void. */
const VERDICTS = {
  go:   { mk: "\u2713", tone: "ok",   gloss: "dispatch" },
  wait: { mk: "~",      tone: "warn", gloss: "time fixes this" },
  ask:  { mk: "?",      tone: "warn", gloss: "a human fixes this" },
  deny: { mk: "\u00D7", tone: "bad",  gloss: "policy fixes this" },
};
const SEVERITY = { go: 0, wait: 1, ask: 2, deny: 3 };
const FRESHNESS = {
  ok:      { mk: "\u2713", tone: "ok",   gloss: "usable" },
  stale:   { mk: "~",      tone: "warn", gloss: "describes a live window, but spend has happened since" },
  expired: { mk: "\u00D7", tone: "bad",  gloss: "the window it describes has ended \u2014 every number in it is void" },
  unknown: { mk: "?",      tone: "mute", gloss: "no reading for this window" },
};
/* The freshness ladder, least to most degraded. unknown sits below expired:
   having no reading is a gap, while holding one about a window that has ended
   is a number that will actively mislead. */
const DEGRADED = ["ok", "stale", "unknown", "expired"];
const UP = "\u25B2", DOWN = "\u25BC", LEVEL = "=";

let DATA = window.__OVERTON__;
let ledgers = {};            // accountId -> LedgerView, for the open ones
let panels = { ledger: {}, why: null, whyData: null };
let clockSkew = 0;           // daemon seconds minus browser seconds
let live = true;
let lastGood = Date.now();
let timer = null;

/* Ages are measured on the DAEMON's clock. A browser an hour out would print
   plausible, wrong reading ages, and "how old is this number" is the one
   question the honesty rules exist to answer. */
function now() { return Math.floor(Date.now() / 1000) + clockSkew; }

function flash(msg, bad) {
  const el = $("#flash");
  el.textContent = msg;
  el.className = "show" + (bad ? " bad" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ""), bad ? 7000 : 2200);
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json", "x-overton": "1" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return data;
}
const getJson = (path) => fetch(path).then((r) => {
  if (!r.ok) throw new Error(path + " \u2192 HTTP " + r.status);
  return r.json();
});

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

function pill(tone, mk, text, title) {
  return '<span class="pill t-' + tone + '"' + (title ? ' title="' + esc(title) + '"' : "") + '>' +
    '<span class="mk" aria-hidden="true">' + mk + '</span>' + esc(text) + '</span>';
}

function verdictPill(verdict, retryAfterSec) {
  const v = VERDICTS[verdict] || { mk: "?", tone: "mute", gloss: "" };
  // Matches verdictLabel() in the core: a bare wait tells a caller nothing.
  const label = verdict === "wait" && retryAfterSec != null ? "wait " + dur(retryAfterSec) : verdict;
  return pill(v.tone, v.mk, label, verdict + " \u2014 " + v.gloss);
}

/**
 * The pace rule. v is the fill as a fraction of the track, hand is where the
 * clock permits by now, stop is a fixed ceiling. All fractions of the track.
 */
function meter(o) {
  const out = ['<div class="meter" role="img" aria-label="' + esc(o.label) + '">',
    '<div class="track"><span class="fill' + (o.over ? " over" : "") +
    '" style="--v:' + clamp01(o.v).toFixed(4) + '"></span></div>'];
  if (o.hand != null) out.push('<span class="hand" style="--at:' + (clamp01(o.hand) * 100).toFixed(2) + '%"></span>');
  if (o.stop != null) out.push('<span class="stop" style="--at:' + (clamp01(o.stop) * 100).toFixed(2) + '%"></span>');
  if (o.spill) out.push('<span class="spill" aria-hidden="true">\u25B8</span>');
  out.push('</div>');
  return out.join("");
}

// ---------------------------------------------------------------------------
// derived, once, so every section agrees
// ---------------------------------------------------------------------------

/** Every (project, account) pairing the gate has an opinion about. */
function pairings() {
  const out = [];
  for (const p of DATA.projects) for (const a of p.accounts) out.push({ projectId: p.projectId, a });
  return out;
}

function accountCfg(id) { return (DATA.config.accounts || {})[id] || {}; }
function windowOf(a, kind) { return a.windows.find((w) => w.kind === kind) || null; }

/**
 * The card's headline state, worst first.
 *
 * Freshness leads because it is a statement about whether the other numbers
 * mean anything at all. The account stop is the AccountStopPolicy's own rule \u2014
 * utilization >= weekly_target_pct, no tolerance \u2014 restated, not re-derived
 * with a threshold of the deck's own invention.
 */
function accountState(a) {
  if (!a.enabled) return { tone: "mute", mk: "\u00D7", text: "disabled", why: "no project may spend on it" };
  if (!a.metered) return { tone: "mute", mk: "=", text: "unmetered", why: "no window to spend against" };
  if (!a.windows.length) return { tone: "warn", mk: "?", text: "no reading", why: "run overton meter" };

  let worst = null;
  for (const w of a.windows) {
    if (w.freshness === "ok") continue;
    if (!worst || DEGRADED.indexOf(w.freshness) > DEGRADED.indexOf(worst.freshness)) worst = w;
  }
  if (worst) {
    const f = FRESHNESS[worst.freshness];
    return { tone: f.tone, mk: f.mk, text: winLabel(worst.kind) + " " + worst.freshness, why: f.gloss };
  }

  const w7 = windowOf(a, "seven_day");
  const target = accountCfg(a.accountId).weekly_target_pct;
  if (w7 && target != null && w7.utilizationPct >= target) {
    return {
      tone: "bad", mk: "\u00D7", text: "at the account stop",
      why: "the account is at " + pct(w7.utilizationPct) + " of a " + target + "% target, which stops every project",
    };
  }
  if (w7 && w7.resetsAt != null && w7.utilizationPct > w7.elapsedPct + 1) {
    return {
      tone: "warn", mk: UP, text: "ahead of the clock",
      why: "descriptive, not a gate: " + pct(w7.utilizationPct) + " used at " + pct(w7.elapsedPct) + " elapsed",
    };
  }
  return { tone: "ok", mk: "\u2713", text: "ok", why: "reading usable, inside the clock" };
}

// ---------------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------------

function renderTiles() {
  const all = pairings();
  const blocked = all.filter((x) => x.a.verdict !== "go");
  let worst = "go";
  for (const x of all) if (SEVERITY[x.a.verdict] > SEVERITY[worst]) worst = x.a.verdict;

  const tiles = [];
  const v = VERDICTS[worst] || VERDICTS.go;
  tiles.push(tile({
    k: "Gate",
    tone: blocked.length ? v.tone : "ok",
    flag: blocked.length > 0,
    mk: blocked.length ? v.mk : "\u2713",
    value: blocked.length ? String(blocked.length) : "clear",
    sub: all.length ? (blocked.length ? "of " + all.length + " pairings refused" : "all " + all.length + " pairings go") : "no pairings configured",
  }));

  // The tightest window across the fleet, measured against the clock rather
  // than against 100% \u2014 ranking by raw percentage gets it exactly backwards.
  let tight = null;
  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    const w = windowOf(a, "seven_day");
    if (!w || w.resetsAt == null) continue;
    const gap = w.utilizationPct - w.elapsedPct;
    if (!tight || gap > tight.gap) tight = { a, w, gap };
  }
  if (tight) {
    const target = accountCfg(tight.a.accountId).weekly_target_pct;
    const stopped = target != null && tight.w.utilizationPct >= target;
    tiles.push(tile({
      k: "Tightest 7d window",
      tone: stopped ? "bad" : tight.gap > 0 ? "warn" : "ok",
      flag: stopped || tight.gap > 0,
      mk: stopped ? "\u00D7" : tight.gap > 0 ? UP : DOWN,
      value: (tight.gap >= 0 ? "+" : "\u2212") + Math.abs(tight.gap).toFixed(0),
      sub: tight.a.accountId + " \u00B7 " + pct(tight.w.utilizationPct) + " used at " + pct(tight.w.elapsedPct) + " elapsed",
    }));
  } else {
    tiles.push(tile({ k: "Tightest 7d window", tone: "mute", mk: "?", value: "\u2014", sub: "no metered window with a reset instant" }));
  }

  const cap = DATA.accounts.filter((a) => a.enabled).reduce((n, a) => n + a.maxConcurrent, 0);
  const held = DATA.claims.length;
  tiles.push(tile({
    k: "Holding capacity",
    tone: cap && held >= cap ? "warn" : "ok",
    flag: cap > 0 && held >= cap,
    mk: cap && held >= cap ? "!" : "=",
    value: held + " / " + cap,
    sub: held ? "open claims, lease " + dur(DATA.meta.claimLeaseSec) : "nothing is spending right now",
  }));

  // Oldest reading, because a deck that shows a confident number from four
  // hours ago is the failure mode the freshness ladder exists to prevent.
  let oldest = null;
  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    if (a.readingAgeSec == null) { oldest = { a, age: Infinity, never: true }; break; }
    if (!oldest || a.readingAgeSec > oldest.age) oldest = { a, age: a.readingAgeSec };
  }
  let fresh = "ok";
  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    for (const w of a.windows) if (DEGRADED.indexOf(w.freshness) > DEGRADED.indexOf(fresh)) fresh = w.freshness;
  }
  const f = FRESHNESS[fresh] || FRESHNESS.unknown;
  tiles.push(tile({
    k: "Oldest reading",
    tone: oldest && oldest.never ? "warn" : f.tone,
    flag: fresh !== "ok" || !!(oldest && oldest.never),
    mk: oldest && oldest.never ? "?" : f.mk,
    value: !oldest ? "\u2014" : oldest.never ? "never" : dur(oldest.age),
    sub: !oldest ? "no metered accounts" : oldest.never ? oldest.a.accountId + " has never been metered" : oldest.a.accountId + " \u00B7 worst freshness " + fresh,
  }));

  $("#tiles").innerHTML = tiles.join("");
}

function tile(o) {
  return '<div class="tile t-' + o.tone + (o.flag ? " flag" : "") + '">' +
    '<div class="tile-k">' + esc(o.k) + '</div>' +
    '<div class="tile-v"><span class="mk" aria-hidden="true">' + o.mk + '</span>' + esc(o.value) + '</div>' +
    '<div class="tile-s">' + esc(o.sub) + '</div></div>';
}

/**
 * What needs attention, as FACTS rather than causes.
 *
 * The verdict comes from the whole policy chain, so "over its allocation" would
 * be a guess three times out of four \u2014 a stale reading, the account-wide stop
 * and the concurrency ceiling all produce a wait with a perfectly healthy
 * pace bar. The numbers shown here are the ones the row would show; the reason
 * is a click away, from the decision itself.
 */
function renderAttention() {
  const rows = [];

  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    const st = accountState(a);
    if (st.tone === "ok" || st.tone === "mute") continue;
    rows.push({
      sev: st.tone === "bad" ? 3 : 1, tone: st.tone, mk: st.mk,
      who: esc(a.accountId), lead: st.text, what: st.why, act: "",
    });
  }

  // A project can be perfectly configured, gate green on every pairing, and
  // still be incapable of spending a point \u2014 no roots means nothing is ever
  // attributed to it, no account means it can never dispatch. Neither shows up
  // as a verdict, because neither produces a pairing to rule on, so both would
  // be invisible on a page built only from decisions.
  for (const [id, p] of Object.entries(DATA.config.projects || {})) {
    if (p.enabled === false) continue;
    if (!(p.roots || []).length) {
      rows.push({
        sev: 2, tone: "warn", mk: "?", who: esc(id), lead: "no roots",
        what: "no directory is declared, so no work will ever be attributed to it",
        act: '<button class="quiet" data-act="focus-roots" data-project="' + esc(id) + '">set directories</button>',
      });
    }
    if (!Object.keys(p.accounts || {}).length) {
      rows.push({
        sev: 2, tone: "warn", mk: "?", who: esc(id), lead: "names no account",
        what: "it can never dispatch anywhere until it has a share of one",
        act: '<button class="quiet" data-act="goto-split">give it a share</button>',
      });
    }
  }

  for (const x of pairings()) {
    if (x.a.verdict === "go") continue;
    const v = VERDICTS[x.a.verdict];
    const label = x.a.verdict === "wait" && x.a.retryAfterSec != null ? "wait " + dur(x.a.retryAfterSec) : x.a.verdict;
    rows.push({
      sev: SEVERITY[x.a.verdict], tone: v.tone, mk: v.mk,
      who: esc(x.projectId) + ' <span class="arrow">\u2192</span> ' + esc(x.a.accountId),
      lead: label,
      what: x.a.alloc > 0
        ? pts(x.a.used) + " of " + pts(x.a.allowance) + " pts permitted by now \u00B7 " + pct(x.a.elapsedPct) + " of the week elapsed"
        : "no allocation on this account",
      act: '<button class="quiet" data-act="why" data-project="' + esc(x.projectId) + '" data-account="' + esc(x.a.accountId) + '">why</button>',
    });
  }

  rows.sort((a, b) => b.sev - a.sev);
  const host = $("#attention");
  if (!rows.length) {
    const n = pairings().length;
    host.innerHTML = '<div class="all-clear"><span class="mk" aria-hidden="true">\u2713</span>' +
      (n ? 'Nothing is refused. ' + n + ' pairing' + (n === 1 ? "" : "s") + ', every reading usable.'
         : 'No project names an account yet, so there is nothing to gate.') + '</div>';
    return;
  }
  host.innerHTML = '<ul class="alerts">' + rows.map((r) =>
    '<li class="alert t-' + r.tone + '"><span class="mk" aria-hidden="true">' + r.mk + '</span>' +
    '<span class="alert-who">' + r.who + '</span>' +
    '<span class="alert-what"><span class="lead">' + esc(r.lead) + '</span> \u00B7 ' + esc(r.what) + '</span>' +
    '<span class="alert-act">' + r.act + '</span></li>').join("") + '</ul>';
}

function windowRow(a, w) {
  const cfg = accountCfg(a.accountId);
  const known = w.resetsAt != null;
  const weekly = w.kind === "seven_day";
  const target = weekly ? cfg.weekly_target_pct : cfg.five_hour_target_pct;
  const f = FRESHNESS[w.freshness] || FRESHNESS.unknown;

  const label = winLabel(w.kind) + " window: " + pct(w.utilizationPct) + " used" +
    (known ? ", " + pct(w.elapsedPct) + " of the window elapsed, resets in " + w.resetsIn
           : ", the vendor did not say when it resets") +
    (target != null ? ", account stop at " + target + "%" : "");

  // Only the weekly window gets a pace delta. The 5-hour window is burst by
  // default \u2014 a flat ceiling, deliberately unpaced, because it refills several
  // times a day \u2014 so marking it "ahead" would imply a gate that is not running.
  let delta = "";
  if (weekly && known) {
    const d = w.utilizationPct - w.elapsedPct;
    const tone = target != null && w.utilizationPct >= target ? "bad" : d > 1 ? "warn" : "ok";
    const mk = d > 1 ? UP : d < -1 ? DOWN : LEVEL;
    const text = Math.abs(d) <= 1 ? "level with the clock" : Math.abs(d).toFixed(0) + " pts " + (d > 0 ? "ahead" : "behind");
    delta = pill(tone, mk, text, "utilization minus elapsed \u2014 descriptive of the account, not a project's gate");
  }

  return '<div class="win"><span class="win-k">' + esc(winLabel(w.kind)) + '</span>' +
    meter({
      v: w.utilizationPct / 100,
      hand: known ? w.elapsedPct / 100 : null,
      stop: target != null ? target / 100 : null,
      label: label,
    }) +
    '<span class="win-meta"><b>' + pct(w.utilizationPct) + '</b> used' +
      (known ? ' at <b>' + pct(w.elapsedPct) + '</b> elapsed' : ' \u00B7 reset instant unknown') +
      (delta ? " " + delta : "") +
      '<span class="spacer"></span>' +
      (w.freshness !== "ok" ? pill(f.tone, f.mk, w.freshness, f.gloss) + " " : "") +
      (known ? "resets " + esc(w.resetsIn) : "") +
    '</span></div>';
}

function renderAccounts() {
  $("#accounts").innerHTML = DATA.accounts.map((a) => {
    const st = accountState(a);
    const cfg = accountCfg(a.accountId);
    const body = a.windows.length
      ? a.windows.map((w) => windowRow(a, w)).join("")
      : '<div class="empty" style="padding:10px 0 0">' +
        (a.metered ? "No reading yet \u2014 run <code>overton meter</code>." : "Unmetered: no window, so nothing to pace.") +
        '</div>';

    const isOpen = !!panels.ledger[a.accountId];
    const led = isOpen ? renderLedger(a) : "";
    // A stripe on every card is decoration. Only warn and bad want an eye;
    // "unmetered" and "disabled" are settings, not conditions.
    const flagged = st.tone === "warn" || st.tone === "bad";
    // Points only mean something where there is a window to spend them from.
    const spendable = a.enabled && a.metered;

    return '<article class="card t-' + st.tone + (flagged ? " flag" : "") + '">' +
      '<div class="card-head">' +
        '<span class="card-name">' + esc(a.accountId) + '</span>' +
        '<span class="chip">' + esc(a.provider) + '</span>' +
        (a.plan ? '<span class="chip">' + esc(a.plan) + '</span>' : "") +
        '<span class="spacer"></span>' + pill(st.tone, st.mk, st.text, st.why) +
      '</div>' + body +
      '<div class="card-foot">' +
        (spendable
          ? '<span>' + pts(a.dispatchable) + ' pts dispatchable</span><span>' + pts(a.attributed) + ' attributed</span>'
          : '<span>not dispatchable</span>') +
        '<span>' + a.claims + '/' + a.maxConcurrent + ' running</span>' +
        '<span class="spacer"></span>' +
        '<span>' + (a.readingAgeSec == null ? "never metered" : "read " + dur(a.readingAgeSec) + " ago") + '</span>' +
        (spendable
          ? '<button class="quiet" data-act="ledger" data-account="' + esc(a.accountId) + '" aria-expanded="' + isOpen + '">' +
            (isOpen ? "hide split" : "who spent it") + '</button>'
          : "") +
      '</div>' + led +
    '</article>';
  }).join("");
}

/**
 * The attribution split, including the spend nobody claimed.
 *
 * The vendor reports one number per account; dividing it across projects is
 * inference, and the gap between the two is the only signal that says a spend
 * source is being missed. It is fetched per account on demand rather than on
 * the poll because it is a different question from "am I on pace".
 */
function renderLedger(a) {
  const v = ledgers[a.accountId];
  if (!v) return '<div class="empty" style="padding:8px 0 0">reading the ledger\u2026</div>';
  const rows = v.rows.slice().sort((x, y) => y.pct - x.pct);
  if (!rows.length) {
    return '<div class="empty" style="padding:8px 0 0">Nothing attributed in this epoch yet.</div>';
  }
  const total = v.attributed;
  const gap = v.vendorPct != null ? v.vendorPct - total : null;
  // tabindex, because a box that scrolls but cannot be focused is unreachable
  // from a keyboard. The allocation table needs none \u2014 its inputs are focusable.
  return '<div class="tablewrap" tabindex="0" role="group" aria-label="attribution split for ' + esc(a.accountId) +
    '" style="margin-top:8px"><table class="grid" style="min-width:0">' +
    '<thead><tr><th>Project</th><th class="n">Attributed</th><th class="n">Output tokens</th><th class="n">Confidence</th></tr></thead><tbody>' +
    rows.map((r) =>
      '<tr><td class="mono">' + esc(r.projectId) + '</td>' +
      '<td class="n">' + r.pct.toFixed(2) + '</td>' +
      '<td class="n">' + r.proxy.toLocaleString() + '</td>' +
      '<td class="n">' + pct(r.confidencePct) + '</td></tr>').join("") +
    '</tbody></table></div>' +
    (gap == null ? "" :
      '<p class="note" style="margin:7px 0 0">vendor says <b>' + pct(v.vendorPct) + '</b>, we attributed <b>' +
      pts(total) + ' pts</b> \u2014 a gap of ' + pts(gap) + '. Some of that is spend from before this epoch was ' +
      'first observed; a <em>widening</em> gap means a source Overton cannot see.</p>');
}

// ---------------------------------------------------------------------------
// the split: one account, divided
// ---------------------------------------------------------------------------

/**
 * Mirrors normalisedShare() in the core, weekly window only.
 *
 * A weight over the sum of the weights of every ENABLED project naming the
 * account. Disabled projects hold a weight but do not compete, so counting them
 * would dilute everyone against a project that cannot spend a point.
 *
 * This is the only place the deck divides anything. It is deliberately NOT the
 * same code path as the allocation table, which prints the gate's own sharePct:
 * if the two ever disagree, the disagreement is a real bug and should be
 * visible on the page rather than hidden by a shared function.
 */
function weightsOn(accountId) {
  const out = {};
  const cfg = DATA.config.projects || {};
  for (const id of Object.keys(cfg)) {
    const p = cfg[id] || {};
    if (p.enabled === false) continue;
    const pa = (p.accounts || {})[accountId];
    if (!pa) continue;
    out[id] = pa.weekly_share == null ? 1 : pa.weekly_share;
  }
  return out;
}

/** Weights to percentages. A total of zero is not a division by zero: it is
    every project denied, which is exactly what the allocator returns for it. */
function normalise(weights) {
  let total = 0;
  for (const id of Object.keys(weights)) total += weights[id];
  const out = {};
  for (const id of Object.keys(weights)) out[id] = total > 0 ? (weights[id] / total) * 100 : 0;
  return out;
}

function cfgNum(o, k, dflt) { const v = o[k]; return typeof v === "number" && isFinite(v) ? v : dflt; }

/** dispatchablePool(): the account's own stop, less what is held back for a person. */
function poolOf(target, reserve) { return Math.max(0, target - reserve); }

/** Integers summing to exactly the requested total, by largest remainder. */
function distribute(exact, total) {
  const ids = Object.keys(exact);
  const out = {}, rem = [];
  let sum = 0;
  for (const id of ids) {
    const f = Math.floor(exact[id]);
    out[id] = f; sum += f; rem.push([id, exact[id] - f]);
  }
  rem.sort((a, b) => b[1] - a[1]);
  for (let i = 0; sum < total && rem.length; i++) { out[rem[i % rem.length][0]] += 1; sum += 1; }
  return out;
}

/**
 * The current split as whole percentages that sum to 100.
 *
 * Whole percentages are what makes this panel honest: written back as weights
 * they sum to 100, so normalisation becomes the identity and the number someone
 * drags is the number they get. Anything else and the label and the allocation
 * drift apart, which is the entire class of bug this panel exists to end.
 */
function round100(exact) {
  const ids = Object.keys(exact);
  if (!ids.length) return {};
  let sum = 0;
  for (const id of ids) sum += exact[id];
  // Everyone at zero is a real, expressible state \u2014 nobody may spend here \u2014 and
  // must not be rounded into an allocation nobody asked for.
  if (sum <= 0) { const z = {}; for (const id of ids) z[id] = 0; return z; }
  const out = distribute(exact, 100);
  // A project with any weight at all keeps at least one point. Zero is a denial
  // somebody typed and the gate answers "deny" for it, so rounding a project
  // into one is precisely the silent starvation this panel is here to prevent.
  for (const id of ids) {
    if (out[id] !== 0 || exact[id] <= 0) continue;
    let big = null;
    for (const j of ids) if (out[j] > 1 && (big == null || out[j] > out[big])) big = j;
    if (big == null) break;
    out[big] -= 1; out[id] += 1;
  }
  return out;
}

/**
 * Move one slider; everybody else moves too.
 *
 * Weights are normalised, so what one project gains another loses \u2014 there is no
 * such thing as changing one share. The remainder is split in proportion to
 * what each project already had, and a project pinned at 0 stays at 0.
 */
function redistribute(vec, movedId, want) {
  const ids = Object.keys(vec);
  const others = ids.filter((i) => i !== movedId);
  let sumOthers = 0;
  for (const i of others) sumOthers += vec[i];
  if (sumOthers <= 0) {
    // Nobody else is competing, so normalisation hands this project the whole
    // pool whatever the slider says. Holding capacity back is the reserve's
    // job; a weight cannot express it.
    const out = {};
    for (const i of ids) out[i] = 0;
    out[movedId] = 100;
    return { vec: out, clamped: true };
  }
  const target = Math.max(0, Math.min(100, Math.round(want)));
  const scaled = {};
  for (const i of others) scaled[i] = (vec[i] * (100 - target)) / sumOthers;
  const out = distribute(scaled, 100 - target);
  out[movedId] = target;
  return { vec: out, clamped: false };
}

/* Drafts are INTENT, never config: nothing in this section touches the file
   until Apply, so a redistribution can be looked at before it happens rather
   than explained after it has. */
let drafts = {};

/** The set of projects competing on an account, as a key: if config changes
    under an open draft the draft describes a world that no longer exists. */
function sigOf(accountId) { return JSON.stringify(Object.keys(weightsOn(accountId)).sort()); }

function draftOf(accountId, create) {
  const d = drafts[accountId];
  if (d && d.sig !== sigOf(accountId)) delete drafts[accountId];
  if (drafts[accountId]) return drafts[accountId];
  if (!create) return null;
  drafts[accountId] = {
    sig: sigOf(accountId),
    shares: round100(normalise(weightsOn(accountId))),
    drop: {},
    target: null,
    reserve: null,
  };
  return drafts[accountId];
}

/** Everything one panel draws, committed and proposed side by side. */
function splitState(accountId) {
  const acfg = accountCfg(accountId);
  const av = DATA.accounts.find((x) => x.accountId === accountId) || null;
  const d = draftOf(accountId, false);
  const committed = normalise(weightsOn(accountId));
  const wasTarget = cfgNum(acfg, "weekly_target_pct", 85);
  const wasReserve = cfgNum(acfg, "interactive_reserve_pct", 0);
  const target = d && d.target != null ? d.target : wasTarget;
  // A reserve above the stop would leave a negative pool, which the allocator
  // clamps to zero \u2014 so the slider is clamped instead, where it can be seen.
  const reserve = Math.min(d && d.reserve != null ? d.reserve : wasReserve, target);
  return {
    acfg, av, d, committed,
    shares: d ? d.shares : round100(committed),
    target, reserve, pool: poolOf(target, reserve),
    wasTarget, wasReserve, wasPool: poolOf(wasTarget, wasReserve),
    // Points are only a real quantity where there is a window to spend them
    // from; on an unmetered or disabled account they would be arithmetic about
    // nothing.
    gated: !!av && av.enabled && av.metered,
  };
}

function verdictOf(projectId, accountId) {
  const p = DATA.projects.find((x) => x.projectId === projectId);
  if (!p) return null;
  return p.accounts.find((a) => a.accountId === accountId) || null;
}

function panelFor(accountId) {
  return Array.prototype.find.call(document.querySelectorAll("[data-mix]"), (el) => el.dataset.mix === accountId) || null;
}
function each(root, sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); }

/** One decimal, but only where a decimal is saying something. */
function share1(v) {
  if (v == null || !isFinite(v)) return "\u2014";
  return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + "%";
}

function renderSplit() {
  const ids = Object.keys(DATA.config.accounts || {});
  const host = $("#split");
  if (!ids.length) {
    host.innerHTML = '<div class="panel"><div class="empty">No accounts configured. Accounts are declared in <code>config.yaml</code>; there is nothing to divide until one exists.</div></div>';
    return;
  }
  host.innerHTML = ids.map(mixPanel).join("");
  for (const id of ids) paintSplit(id);
}

function mixPanel(accountId, idx) {
  const s = splitState(accountId);
  const st = s.av ? accountState(s.av) : { tone: "mute", mk: "?", text: "not configured", why: "" };
  const order = Object.keys(s.shares).sort((a, b) =>
    (s.committed[b] || 0) - (s.committed[a] || 0) || (a < b ? -1 : a > b ? 1 : 0));
  const dropped = s.d ? Object.keys(s.d.drop) : [];
  const cfgP = DATA.config.projects || {};
  const absent = Object.keys(cfgP).filter((p) =>
    cfgP[p].enabled !== false && !(p in s.shares) && dropped.indexOf(p) < 0);
  const parked = Object.keys(cfgP).filter((p) => cfgP[p].enabled === false && (cfgP[p].accounts || {})[accountId]);

  const segs = order.map((pid, i) =>
      '<span class="seg p' + (i % 2 ? " alt" : "") + '" data-seg-for="' + esc(pid) +
      '" title="' + esc(pid) + '"></span>').join("") +
    '<span class="seg free" data-seg-free title="dispatchable, and allocated to nobody"></span>' +
    '<span class="seg res" data-seg-res title="held back for your own interactive work"></span>' +
    '<span class="seg head" data-seg-head title="above the account stop \u2014 nobody spends here"></span>';

  const rows = order.length
    ? order.map((pid, i) => mixRow(s, accountId, pid, idx, i)).join("")
    : '<div class="empty" style="padding:12px 0 4px">No project names this account, so none of its capacity is allocated. Give one a share below.</div>';

  return '<article class="mix t-' + st.tone + (st.tone === "warn" || st.tone === "bad" ? " flag" : "") +
      '" data-mix="' + esc(accountId) + '" aria-labelledby="mx' + idx + '">' +
    '<div class="mix-head">' +
      '<span class="mix-name" id="mx' + idx + '">' + esc(accountId) + '</span>' +
      '<span class="chip">' + esc(s.acfg.provider || "?") + '</span>' +
      (s.av && s.av.plan ? '<span class="chip">' + esc(s.av.plan) + '</span>' : "") +
      '<span class="spacer"></span>' + pill(st.tone, st.mk, st.text, st.why) +
    '</div>' +
    '<div class="mix-disp"><b data-pool>\u2014</b> <span data-pool-sub></span></div>' +
    '<div class="cap" role="img" data-cap aria-label="the split of this account">' + segs + '</div>' +
    '<div class="cap-key">' +
      '<span><i class="k-p"></i>allocated to projects</span>' +
      '<span><i class="k-res"></i>held back for you</span>' +
      '<span data-key-free hidden><i class="k-free"></i>allocated to nobody</span>' +
      '<span><i class="k-head"></i>above the account stop</span>' +
    '</div>' +
    dials(s, accountId, idx) +
    rows +
    dropped.map((pid) => goneRow(accountId, pid)).join("") +
    (absent.length
      ? '<div class="mix-more">not named here: ' + absent.map((p) =>
          '<button class="quiet" data-act="include" data-account="' + esc(accountId) + '" data-project="' + esc(p) +
          '" title="give ' + esc(p) + ' a share of this account">+ ' + esc(p) + '</button>').join(" ") + '</div>'
      : "") +
    (parked.length
      ? '<div class="mix-more">disabled, so not competing: ' + esc(parked.join(", ")) + '</div>'
      : "") +
    '<div data-pending></div>' +
  '</article>';
}

function dials(s, accountId, idx) {
  return '<div class="dials">' +
    '<div class="dial">' +
      '<label for="dt' + idx + '">Account stop \u00B7 7 days</label>' +
      '<div class="dial-in">' +
        '<input type="range" id="dt' + idx + '" min="0" max="100" step="1" data-act="target" data-account="' + esc(accountId) + '">' +
        '<span class="dial-v" data-target-v>\u2014</span>' +
      '</div>' +
      '<div class="dial-why">No project may spend past this, whatever its share.</div>' +
    '</div>' +
    '<div class="dial">' +
      '<label for="dr' + idx + '">Held back for you</label>' +
      '<div class="dial-in">' +
        '<input type="range" id="dr' + idx + '" min="0" max="100" step="1" data-act="reserve" data-account="' + esc(accountId) + '">' +
        '<span class="dial-v" data-reserve-v>\u2014</span>' +
      '</div>' +
      '<div class="dial-why">Never dispatchable to an agent. This is the only way to leave capacity unallocated \u2014 weights always divide the whole of what is left.</div>' +
    '</div>' +
  '</div>';
}

function mixRow(s, accountId, projectId, idx, i) {
  const v = verdictOf(projectId, accountId);
  const roots = ((DATA.config.projects || {})[projectId] || {}).roots || [];
  const zero = (s.shares[projectId] || 0) <= 0;
  return '<div class="mixrow' + (zero ? " zero" : "") + '" data-row-for="' + esc(projectId) + '">' +
    '<label class="mixrow-name" for="sl' + idx + '-' + i + '"><b>' + esc(projectId) + '</b>' +
      (roots.length ? "" : pill("warn", "?", "no roots", "nothing will ever be attributed to it, so its share cannot be spent")) +
      (v && v.verdict !== "go" ? verdictPill(v.verdict, v.retryAfterSec) : "") +
    '</label>' +
    '<div class="mixrow-slider">' +
      '<input type="range" id="sl' + idx + '-' + i + '" min="0" max="100" step="1" data-act="share" ' +
      'data-account="' + esc(accountId) + '" data-project="' + esc(projectId) + '"></div>' +
    '<div class="mixrow-num"><b data-pct-for="' + esc(projectId) + '">\u2014</b>' +
      '<span class="sub" data-pts-for="' + esc(projectId) + '">\u2014</span></div>' +
    '<div><button class="quiet danger" data-act="unname" data-account="' + esc(accountId) + '" data-project="' + esc(projectId) +
      '" title="take ' + esc(projectId) + ' off this account entirely">\u00D7</button></div>' +
  '</div>';
}

function goneRow(accountId, projectId) {
  return '<div class="mixrow gone"><span class="mixrow-name"><b>' + esc(projectId) + '</b></span>' +
    '<span class="sub">will be taken off this account</span>' +
    '<span class="mixrow-num">\u2014</span>' +
    '<div><button class="quiet" data-act="keep" data-account="' + esc(accountId) + '" data-project="' + esc(projectId) + '">undo</button></div>' +
  '</div>';
}

/* value and --v are written together and nowhere else, so the fill painted
   behind the thumb and the number printed beside it cannot drift apart. */
function setSlider(el, v, max) {
  if (!el) return;
  const top = max == null ? Number(el.max) || 100 : max;
  if (max != null) el.max = String(max);
  if (Number(el.value) !== v) el.value = String(v);
  el.style.setProperty("--v", (top > 0 ? clamp01(v / top) : 0).toFixed(4));
}

/**
 * Repaint one panel's numbers in place.
 *
 * In place, and not by rebuilding the panel, because this runs on every pixel
 * of a drag: an innerHTML rewrite would take the focus off the slider under the
 * pointer and end the gesture.
 */
function paintSplit(accountId) {
  const panel = panelFor(accountId);
  if (!panel) return;
  const s = splitState(accountId);
  const shown = (pid) => (s.d ? s.shares[pid] : s.committed[pid]);
  const points = (pid) => s.pool * (shown(pid) || 0) / 100;

  each(panel, "[data-act=share]", (el) => {
    const pid = el.dataset.project;
    if (s.shares[pid] == null) return;
    setSlider(el, s.shares[pid]);
    // The spoken value is the printed value, to the same precision: two
    // readings of one number is two numbers.
    el.setAttribute("aria-valuetext", share1(shown(pid)) + " of " + accountId +
      (s.gated ? ", " + pts(points(pid)) + " points" : ", which is not gated"));
  });
  each(panel, "[data-pct-for]", (el) => {
    const pid = el.dataset.pctFor;
    el.textContent = s.d ? s.shares[pid] + "%" : share1(s.committed[pid]);
  });
  each(panel, "[data-pts-for]", (el) => {
    const pid = el.dataset.ptsFor;
    el.textContent = (shown(pid) || 0) <= 0 ? "denied"
      : s.gated ? pts(points(pid)) + " pts" : "not gated";
  });
  each(panel, "[data-row-for]", (el) => {
    el.classList.toggle("zero", (shown(el.dataset.rowFor) || 0) <= 0);
  });

  each(panel, "[data-seg-for]", (el) => {
    const w = s.pool * (shown(el.dataset.segFor) || 0) / 100;
    el.style.display = w > 0 ? "" : "none";
    el.style.flexBasis = w.toFixed(4) + "%";
  });
  // Whatever the projects did not take. Normalisation means this is zero
  // except when nobody is competing at all, which is precisely the state that
  // must not be mistaken for the headroom above the stop.
  let claimed = 0;
  for (const pid of Object.keys(s.shares)) claimed += s.pool * (shown(pid) || 0) / 100;
  const free = Math.max(0, s.pool - claimed);
  const freeSeg = panel.querySelector("[data-seg-free]");
  freeSeg.style.display = free > 0.001 ? "" : "none";
  freeSeg.style.flexBasis = free.toFixed(4) + "%";
  panel.querySelector("[data-key-free]").hidden = !(free > 0.001);

  const res = panel.querySelector("[data-seg-res]");
  res.style.display = s.reserve > 0 ? "" : "none";
  res.style.flexBasis = s.reserve.toFixed(4) + "%";
  const head = panel.querySelector("[data-seg-head]");
  const above = Math.max(0, 100 - s.target);
  head.style.display = above > 0 ? "" : "none";
  head.style.flexBasis = above.toFixed(4) + "%";
  const nprojects = Object.keys(s.shares).filter((pid) => (shown(pid) || 0) > 0).length;
  panel.querySelector("[data-cap]").setAttribute("aria-label",
    pts(s.pool) + " points to divide: " + pts(claimed) + " allocated across " +
    nprojects + (nprojects === 1 ? " project" : " projects") +
    (free > 0.001 ? ", " + pts(free) + " allocated to nobody" : "") +
    ", " + s.reserve + " points held back for interactive work, " +
    above + " points above the account stop");

  const tEl = panel.querySelector("[data-act=target]");
  setSlider(tEl, s.target, 100);
  tEl.setAttribute("aria-valuetext", s.target + "% of the plan window \u2014 the account stop");
  const rEl = panel.querySelector("[data-act=reserve]");
  setSlider(rEl, s.reserve, s.target || 100);
  rEl.setAttribute("aria-valuetext",
    s.reserve + "% held back, leaving " + (s.gated ? pts(s.pool) + " points" : s.pool + "%") + " to divide");
  panel.querySelector("[data-target-v]").textContent = s.target + "%";
  panel.querySelector("[data-reserve-v]").textContent = s.reserve + "%";
  panel.querySelector("[data-pool]").textContent = s.gated ? pts(s.pool) + " pts" : s.pool + "%";
  panel.querySelector("[data-pool-sub]").textContent =
    "to divide \u2014 the " + s.target + "% stop less the " + s.reserve + "% you keep" +
    (s.gated ? "" : " \u00B7 this account is not gated, so the split has no effect today");

  panel.querySelector("[data-pending]").innerHTML = pendingBlock(accountId);
}

/**
 * The redistribution, before it happens.
 *
 * Someone once added a project at weight 2 and took another from 63% of an
 * account to 18% without a single number on the page moving to say so. This is
 * that number, for every project the edit touches, in the points the gate
 * actually compares against.
 */
function pendingBlock(accountId) {
  const s = splitState(accountId);
  if (!s.d) return "";
  const ids = Object.keys(s.shares).concat(Object.keys(s.d.drop))
    .sort((a, b) => (s.committed[b] || 0) - (s.committed[a] || 0) || (a < b ? -1 : a > b ? 1 : 0));
  const rows = [];
  for (const pid of ids) {
    const before = s.committed[pid] == null ? null : s.committed[pid];
    const after = s.d.drop[pid] ? null : s.shares[pid];
    const bp = before == null ? null : s.wasPool * before / 100;
    const ap = after == null ? null : s.pool * after / 100;
    if (before != null && after != null && Math.abs(before - after) < 0.05 && Math.abs((bp || 0) - (ap || 0)) < 0.05) continue;
    // The arrow follows the POINTS, not the percentage. Raising an account's
    // reserve leaves every share exactly where it was and still takes points
    // off everyone, and an arrow pointing up through that would be describing
    // the label rather than the consequence.
    const bcmp = s.gated ? bp : before, acmp = s.gated ? ap : after;
    const mk = after == null ? "\u00D7" : before == null ? "+"
      : acmp > bcmp + 0.005 ? UP : acmp < bcmp - 0.005 ? DOWN : LEVEL;
    rows.push('<div><span class="who">' + esc(pid) + '</span><span class="mk" aria-hidden="true">' + mk + '</span>' +
      '<span>' + (before == null ? "not named" : share1(before) + (s.gated ? " \u00B7 " + pts(bp) + " pts" : "")) +
      ' \u2192 <b>' + (after == null ? "taken off this account"
        : after + "%" + (s.gated ? " \u00B7 " + pts(ap) + " pts" : "") + (after <= 0 ? " \u00B7 denied" : "")) + '</b></span></div>');
  }
  if (s.target !== s.wasTarget) {
    rows.push('<div><span class="who">account stop</span><span class="mk" aria-hidden="true">' +
      (s.target > s.wasTarget ? UP : DOWN) + '</span><span>' + s.wasTarget + '% \u2192 <b>' + s.target + '%</b></span></div>');
  }
  if (s.reserve !== s.wasReserve) {
    rows.push('<div><span class="who">held back</span><span class="mk" aria-hidden="true">' +
      (s.reserve > s.wasReserve ? UP : DOWN) + '</span><span>' + s.wasReserve + '% \u2192 <b>' + s.reserve +
      '%</b> \u00B7 ' + pts(s.wasPool) + ' \u2192 ' + pts(s.pool) + ' pts to divide</span></div>');
  }
  if (!rows.length) return "";

  return '<div class="pending" role="group" aria-label="pending changes to ' + esc(accountId) + '">' +
    '<div class="pending-h">Not written yet \u2014 this is what applying would do</div>' +
    '<div class="pending-w">Shares are written back as whole percentages summing to 100, so the number on the slider is the share the gate uses.</div>' +
    '<div class="diff">' + rows.join("") + '</div>' +
    '<div class="pending-act">' +
      '<button class="primary" data-act="apply-split" data-account="' + esc(accountId) + '">Apply to ' + esc(accountId) + '</button>' +
      '<button data-act="cancel-split" data-account="' + esc(accountId) + '">Discard</button>' +
    '</div></div>';
}

/**
 * Write the draft.
 *
 * SEQUENTIALLY, and this is not a style choice: every config route re-reads
 * config.yaml, edits the document and saves the whole file, so two writes in
 * flight at once would have the second overwrite the first.
 */
async function applySplit(accountId) {
  const s = splitState(accountId);
  if (!s.d) return;
  const w = weightsOn(accountId);
  const writes = [];
  const patch = {};
  if (s.target !== s.wasTarget) patch.weekly_target_pct = s.target;
  if (s.reserve !== s.wasReserve) patch.interactive_reserve_pct = s.reserve;
  if (Object.keys(patch).length) writes.push(["PATCH", "/v1/config/accounts/" + encodeURIComponent(accountId), patch]);
  for (const pid of Object.keys(s.shares)) {
    if (w[pid] === s.shares[pid]) continue;
    writes.push(["PUT", "/v1/config/projects/" + encodeURIComponent(pid) + "/accounts/" + encodeURIComponent(accountId),
      { weight: s.shares[pid] }]);
  }
  for (const pid of Object.keys(s.d.drop)) {
    writes.push(["DELETE", "/v1/config/projects/" + encodeURIComponent(pid) + "/accounts/" + encodeURIComponent(accountId), null]);
  }
  if (!writes.length) { delete drafts[accountId]; render(); return; }

  let done = 0;
  try {
    for (const wr of writes) { await api(wr[0], wr[1], wr[2]); done += 1; }
    delete drafts[accountId];
    await afterEdit(accountId + " divided: " + writes.length + " change" + (writes.length === 1 ? "" : "s") + " written");
  } catch (err) {
    // Partly written is the honest report. The draft goes, because the config
    // it described is no longer the config on disk.
    delete drafts[accountId];
    await refresh();
    render();
    flash(done + " of " + writes.length + " changes were written, then: " + err.message, true);
  }
}

/** Config is the source of truth for which projects exist \u2014 projectViews
    omits the disabled ones, and a project that silently vanishes from the deck
    when someone toggles it in the YAML is worse than one shown greyed out. */
function projectRows() {
  const cfg = DATA.config.projects || {};
  const byId = {};
  for (const p of DATA.projects) byId[p.projectId] = p;
  const ids = Object.keys(cfg);
  for (const p of DATA.projects) if (ids.indexOf(p.projectId) < 0) ids.push(p.projectId);
  return ids.map((id) => ({
    id,
    cfg: cfg[id] || { accounts: {}, roots: [] },
    view: byId[id] || null,
    enabled: cfg[id] ? cfg[id].enabled !== false : true,
  }));
}

function renderAlloc() {
  const out = [];
  for (const p of projectRows()) {
    const roots = (p.cfg.roots || []);
    const accountIds = Object.keys(p.cfg.accounts || {});
    // The two ways a project can exist and still be incapable of anything. Both
    // are silent in the config file and both look exactly like a working
    // project from every other angle, so they are said out loud here.
    const broken =
      (roots.length ? "" : pill("warn", "?", "no roots", "no directory is declared, so no work can ever be attributed to it \u2014 its share cannot be spent")) +
      (accountIds.length ? "" : pill("warn", "?", "no account", "it names no account, so it can never dispatch anywhere"));
    out.push('<tr class="grp"><th colspan="9" scope="rowgroup"><div class="grp-in">' +
      '<span class="grp-name">' + esc(p.id) + '</span>' +
      (p.enabled ? "" : pill("mute", "\u00D7", "disabled", "not allocated, and its weights do not dilute anyone else's share")) +
      broken +
      '<span class="spacer"></span>' +
      '<button class="quiet" data-act="toggle" data-project="' + esc(p.id) + '" data-to="' + (p.enabled ? "0" : "1") + '">' +
        (p.enabled ? "disable" : "enable") + '</button>' +
      '<button class="quiet danger" data-act="rm" data-project="' + esc(p.id) + '">remove</button>' +
      '</div>' + rootsField(p.id, roots) + '</th></tr>');

    if (!p.view && !accountIds.length) {
      out.push('<tr><td colspan="9" class="empty">No account named, so this project may not spend anywhere. ' +
        '<button class="quiet" data-act="goto-split">give it a share of an account</button></td></tr>');
      continue;
    }

    if (!p.enabled || !p.view) {
      for (const id of accountIds) out.push(ungatedRow(p, id, "not gated \u2014 this project is disabled"));
      continue;
    }

    for (const a of p.view.accounts) out.push(allocRow(p.id, a));
    // Accounts named in config but skipped by the view: the account is off.
    for (const id of accountIds) {
      if (p.view.accounts.some((a) => a.accountId === id)) continue;
      out.push(ungatedRow(p, id, "the account is disabled, so this pairing is not gated"));
    }
  }
  $("#alloc-body").innerHTML = out.join("") ||
    '<tr><td colspan="9" class="empty">No projects yet. Add one below to start allocating.</td></tr>';
}

/**
 * Directories, editable where they are read.
 *
 * A project whose roots are wrong is a project nothing is charged to, and until
 * now the only cure was the CLI \u2014 the deck could show the fault and not fix it,
 * which is the worst of both. Committed on Enter or on "save", never on blur:
 * a path is too easy to lose to a stray click somewhere else on the page.
 */
function rootsField(projectId, roots) {
  const v = roots.join(", ");
  return '<div class="field"><label for="rt-' + esc(projectId) + '">Directories \u2014 work under these is charged here, longest root first</label>' +
    '<div class="field-in">' +
      '<input type="text" id="rt-' + esc(projectId) + '" value="' + esc(v) + '" data-act="roots" data-project="' + esc(projectId) +
      '" data-orig="' + esc(v) + '" placeholder="~/Projects/thing, ~/Work/other">' +
      '<button class="quiet" data-act="save-roots" data-project="' + esc(projectId) + '" disabled>save</button>' +
    '</div></div>';
}

/** A pairing the gate has no opinion about. The weight is still worth showing:
    it is what the pairing becomes the moment the account is enabled again. */
function ungatedRow(p, accountId, why) {
  const weight = (p.cfg.accounts[accountId] || {}).weekly_share;
  return '<tr><td class="acct-cell">' + esc(accountId) + '</td>' + weightCell(weight) +
    '<td colspan="7" class="empty" style="padding:8px 10px">' + esc(why) + '</td></tr>';
}

/* Read-only, and labelled as a weight rather than left as a bare number. It is
   edited in The split, where the consequence of changing it \u2014 every other
   project on the account moving \u2014 can be seen while it is being decided. */
function weightCell(weight) {
  return '<td class="n">' + (weight == null ? 1 : weight) + '</td>';
}

function allocRow(projectId, a) {
  // over and pace are the gate's own, never recomputed. Only the phrasing
  // is ours: "under" is the one genuinely comfortable state, and "on pace"
  // means within a rounding of the allowance \u2014 the last moment before refusal.
  const under = !a.over && a.pace.indexOf("under") === 0;
  const paceTone = a.over ? "bad" : under ? "ok" : "warn";
  const paceMk = a.over ? UP : under ? DOWN : LEVEL;

  // Where it lands at this rate. Mirrors projectedFinish() in the allocator,
  // including its refusal to extrapolate from an elapsed fraction near zero.
  const elapsed = a.elapsedPct / 100;
  const projected = elapsed > 0.01 ? a.used / elapsed : null;

  // A share of 0 is a positive statement \u2014 this project may never use this
  // account \u2014 so a pace bar, an allowance and a projection are all answers to a
  // question nobody asked. The verdict is the whole of it.
  const middle = a.alloc <= 0
    ? '<td colspan="4" class="empty" style="padding:8px 10px">no allocation \u2014 a weight of 0 says this project may never use this account</td>'
    : '<td style="min-width:190px">' + meter({
        v: a.used / a.alloc,
        hand: a.allowance / a.alloc,
        over: a.over,
        spill: a.used > a.alloc,
        label: pts(a.used) + " of " + pts(a.alloc) + " points allocated used; the clock permits " +
               pts(a.allowance) + " by now",
      }) + '</td>' +
      '<td class="n">' + pts(a.used) + ' / ' + pts(a.allowance) +
        '<div class="sub">of ' + pts(a.alloc) + ' alloc</div></td>' +
      '<td class="n">' + pill(paceTone, paceMk, a.pace, "as the gate sees it") + '</td>' +
      '<td class="n hide-sm">' + (projected == null ? "\u2014" : pts(projected) +
        '<div class="sub">' + (projected / a.alloc * 100).toFixed(0) + '% of alloc</div>') + '</td>';

  return '<tr>' +
    '<td class="acct-cell">' + esc(a.accountId) + '</td>' +
    weightCell(a.weight) +
    '<td class="n hide-sm">' + share1(a.sharePct) + '</td>' +
    middle +
    '<td class="n">' + verdictPill(a.verdict, a.retryAfterSec) + '</td>' +
    '<td class="n"><button class="quiet" data-act="why" data-project="' + esc(projectId) + '" data-account="' + esc(a.accountId) + '"' +
      (panels.why && panels.why.project === projectId && panels.why.account === a.accountId ? ' aria-expanded="true"' : "") +
      '>why</button></td>' +
  '</tr>' + whyRow(projectId, a.accountId);
}

/** The decision, in full, from the gate that made it. */
function whyRow(projectId, accountId) {
  if (!panels.why || panels.why.project !== projectId || panels.why.account !== accountId) return "";
  const d = panels.whyData;
  if (!d) return '<tr class="why"><td colspan="9" class="empty">asking the gate\u2026</td></tr>';
  const v = VERDICTS[d.verdict] || VERDICTS.go;
  return '<tr class="why t-' + v.tone + '"><td colspan="9"><div class="why-in">' +
    '<div class="why-head">' + verdictPill(d.verdict, d.retryAfterSec) +
      '<span class="why-sum">' + esc(d.summary) + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="quiet" data-act="why-close">close</button></div>' +
    (d.detail && d.detail.length ? '<pre>' + esc(d.detail.join("\n")) + '</pre>' : "") +
    (d.remedies && d.remedies.length ? '<ul>' + d.remedies.map((r) => '<li>' + esc(r) + '</li>').join("") + '</ul>' : "") +
    '<div class="rulings">decided by <b>' + esc(d.policy) + '</b> \u2014 every policy ruled, the worst verdict won:' +
      (d.rulings || []).map((r) => '<div>' + esc(r.verdict) + "  " + esc(r.policy) + " \u00B7 " + esc(r.summary) + '</div>').join("") +
    '</div></div></td></tr>';
}

function renderClaims() {
  const host = $("#claims");
  if (!DATA.claims.length) {
    host.innerHTML = '<div class="empty">Nothing is holding capacity. A claim is opened by <code>overton claim</code> or <code>overton run</code>, and reaped if its heartbeat goes quiet for ' + esc(dur(DATA.meta.claimLeaseSec)) + '.</div>';
    return;
  }
  const lease = DATA.meta.claimLeaseSec;
  const t = now();
  host.innerHTML = '<div class="tablewrap" tabindex="0" role="group" aria-label="open claims"><table class="grid"><thead><tr>' +
    '<th>Project</th><th>Account</th><th class="n">Age</th><th class="n">Last beat</th><th>Label</th><th class="n hide-sm">PID</th>' +
    '</tr></thead><tbody>' +
    DATA.claims.map((c) => {
      const beat = t - c.heartbeatAt;
      // Reaping is the daemon's job; showing how close a claim is to it turns a
      // fleet that died quietly into something visible before capacity idles.
      const tone = beat >= lease ? "bad" : beat > lease / 2 ? "warn" : "ok";
      const mk = beat >= lease ? "\u00D7" : beat > lease / 2 ? "~" : "\u2713";
      return '<tr><td class="mono">' + esc(c.projectId) + '</td>' +
        '<td class="mono">' + esc(c.accountId) + '</td>' +
        '<td class="n">' + dur(t - c.openedAt) + '</td>' +
        '<td class="n">' + pill(tone, mk, dur(beat) + " ago", beat >= lease ? "past its lease \u2014 due to be reaped" : "heartbeat") + '</td>' +
        '<td class="mono">' + esc(c.label || "\u2014") + '</td>' +
        '<td class="n hide-sm">' + (c.pid == null ? "\u2014" : c.pid) + '</td></tr>';
    }).join("") + '</tbody></table></div>';
}

/**
 * The name field offers the projects that already exist, and the form's verb
 * changes to match what submitting will actually do.
 *
 * A form that can only ever ADD sends someone to the CLI the first time they
 * want to move a directory, which is exactly what happened. Typing a name that
 * exists updates that project instead of failing, and the button says so before
 * the submit rather than an error saying it afterwards.
 */
function renderProjectForm() {
  const ids = Object.keys(DATA.config.projects || {});
  const host = $("#project-names");
  const key = JSON.stringify(ids);
  if (host.dataset.key !== key) {
    host.dataset.key = key;
    host.innerHTML = ids.map((id) => '<option value="' + esc(id) + '"></option>').join("");
  }
  syncProjectForm();
}

function syncProjectForm() {
  const id = $("#add-id").value.trim();
  const existing = !!(DATA.config.projects || {})[id];
  $("#add-submit").textContent = existing ? "Update " + id : "Create project";
  $("#add-hint").textContent = existing
    ? "This project already exists \u2014 submitting rewrites its directories. Its shares are left alone; those are set in The split."
    : "Creates the project. Give it a share of an account in The split afterwards, or it can never dispatch anywhere.";
  // Prefilled from the project it names, but only for as long as nobody has
  // typed into the field themselves.
  const roots = $("#add-roots");
  if (existing && roots.dataset.auto !== "no") {
    roots.value = (((DATA.config.projects || {})[id] || {}).roots || []).join(", ");
    roots.dataset.auto = "yes";
  } else if (!existing && roots.dataset.auto === "yes") {
    roots.value = "";
    delete roots.dataset.auto;
  }
}

function renderStamp() {
  const at = new Date(lastGood).toLocaleTimeString();
  const bits = [];
  if (!live) bits.push(pill("bad", "\u00D7", "not answering", "the last refresh failed \u2014 these numbers are from " + at));
  bits.push('<span class="stamp">' + (live ? "updated " + esc(at) + " \u00B7 auto 30s" : "last good " + esc(at)) + '</span>');
  // A browser clock well out from the daemon's makes every age on the page a
  // small lie, so say so rather than quietly rendering it.
  if (Math.abs(clockSkew) > 60) {
    bits.push(pill("warn", "!", "clock skew " + dur(Math.abs(clockSkew)), "this browser's clock differs from the daemon's; ages use the daemon's"));
  }
  $("#stamp-host").innerHTML = bits.join(" ");
}

function renderFoot() {
  $("#foot").innerHTML =
    'Policy chain <span class="chain">' + esc((DATA.meta.chain || []).join("  \u2192  ")) + '</span>. ' +
    'Every policy rules on every request and the worst verdict wins, so the chain\u2019s order decides only which refusal is reported. ' +
    'Pacing allows a floor of ' + Math.round((DATA.meta.floorPct || 0) * 100) + '% of alloc at a window boundary and ' +
    Math.round((DATA.meta.slackPct || 0) * 100) + '% slack above the paced line.';
}

function render() {
  renderStamp();
  renderTiles();
  renderAttention();
  renderAccounts();
  // Never rebuild anything under someone's hand: a 30-second poll landing
  // mid-gesture would take the slider out from under the pointer, or throw away
  // the path they were halfway through typing. Drafts survive a rebuild \u2014 they
  // live in the draft table, not in the DOM \u2014 so this only has to protect the gesture.
  if (!busy("#split")) renderSplit();
  if (!busy("#alloc")) renderAlloc();
  renderClaims();
  renderProjectForm();
  renderFoot();
}

/* An INPUT specifically: a slider mid-drag or a path half typed is a gesture in
   progress. A focused BUTTON is not \u2014 and treating it as one would freeze the
   section that the button's own edit is supposed to redraw. */
function busy(sel) {
  const el = document.activeElement;
  return !!(el && el.tagName === "INPUT" && el.closest && el.closest(sel));
}

// ---------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------

/** The API reports the normalised share; the weight is what a person edits. */
function withWeights(projects) {
  const cfg = DATA.config.projects || {};
  return projects.map((p) => ({
    ...p,
    accounts: p.accounts.map((a) => ({
      ...a,
      weight: ((cfg[p.projectId] || {}).accounts || {})[a.accountId]?.weekly_share ?? 1,
    })),
  }));
}

/* Config is re-read every poll, not only after an edit: config.yaml is
   hand-edited too, and a deck showing weights the file no longer has is the
   instrument disagreeing with the thing it controls. */
async function refresh(loud) {
  try {
    const [accounts, projects, claims, config, health] = await Promise.all([
      getJson("/v1/accounts"), getJson("/v1/projects"), getJson("/v1/claims"),
      getJson("/v1/config"), getJson("/v1/health"),
    ]);
    clockSkew = health.now - Math.floor(Date.now() / 1000);
    DATA = {
      ...DATA, accounts, claims, config,
      meta: { ...DATA.meta, chain: health.policies || DATA.meta.chain, now: health.now },
    };
    DATA.projects = withWeights(projects);
    lastGood = Date.now();
    live = true;
    if (loud) flash("Refreshed");
  } catch (err) {
    live = false;
    flash(err.message, true);
  }
  await Promise.all(Object.keys(panels.ledger).map(loadLedger));
  render();
}

async function loadLedger(accountId) {
  try {
    ledgers[accountId] = await getJson("/v1/ledger?account=" + encodeURIComponent(accountId));
  } catch (err) {
    delete ledgers[accountId];
  }
}

/* /v1/ask RECORDS the decision it makes, which is why this is on a click and
   not on the poll: the decisions table is the audit trail for "why did it
   refuse at 03:00", and filling it with a deck idling in a background tab would
   bury the answer. One row per deliberate question is a fair price for the only
   honest source of a reason. */
async function loadWhy(project, account) {
  panels.why = { project, account };
  panels.whyData = null;
  render();
  try {
    panels.whyData = await getJson("/v1/ask?project=" + encodeURIComponent(project) + "&account=" + encodeURIComponent(account));
  } catch (err) {
    panels.why = null;
    flash(err.message, true);
  }
  render();
}

async function afterEdit(msg) {
  DATA.config = await getJson("/v1/config");
  await refresh();
  flash(msg);
}

// ---------------------------------------------------------------------------
// interaction
// ---------------------------------------------------------------------------

/* Sliders are read on the input event, not the change event, so the whole panel tracks the
   gesture rather than reporting afterwards what it did. Nothing here writes: it
   moves a draft, and a draft is intent. */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el || !el.dataset) return;
  const act = el.dataset.act;

  if (act === "share" || act === "reserve" || act === "target") {
    const accountId = el.dataset.account;
    const d = draftOf(accountId, true);
    if (act === "share") {
      const moved = redistribute(d.shares, el.dataset.project, Number(el.value));
      d.shares = moved.vec;
      if (moved.clamped) {
        flash("Every other project on " + accountId + " is at 0, so this one takes the whole pool whatever the slider says. " +
              "Capacity is held back with the reserve, not with a weight.", true);
      }
    } else if (act === "target") {
      d.target = Number(el.value);
      const reserve = d.reserve != null ? d.reserve : cfgNum(accountCfg(accountId), "interactive_reserve_pct", 0);
      if (reserve > d.target) d.reserve = d.target;
    } else {
      const target = d.target != null ? d.target : cfgNum(accountCfg(accountId), "weekly_target_pct", 85);
      d.reserve = Math.min(Number(el.value), target);
    }
    paintSplit(accountId);
    return;
  }

  // The save button stays inert until the path is actually different, so the button is
  // never a way to rewrite config.yaml with what it already says.
  if (act === "roots") {
    const btn = Array.prototype.find.call(
      document.querySelectorAll("[data-act=save-roots]"), (b) => b.dataset.project === el.dataset.project);
    if (btn) btn.disabled = el.value === el.dataset.orig;
    return;
  }

  if (el.id === "add-id") { syncProjectForm(); return; }
  if (el.id === "add-roots") { el.dataset.auto = "no"; }
});

/* Which slice of the bar is which project, answered by pointing at the project
   rather than by asking anyone to match two shades of the same blue. */
function lightSeg(e, on) {
  const row = e.target && e.target.closest ? e.target.closest("[data-row-for]") : null;
  const panel = row && row.closest("[data-mix]");
  if (!panel) return;
  each(panel, "[data-seg-for]", (seg) => {
    if (seg.dataset.segFor === row.dataset.rowFor) seg.classList.toggle("lit", on);
  });
}
document.addEventListener("pointerover", (e) => lightSeg(e, true));
document.addEventListener("pointerout", (e) => lightSeg(e, false));
document.addEventListener("focusin", (e) => lightSeg(e, true));
document.addEventListener("focusout", (e) => lightSeg(e, false));

/* A path is committed deliberately, never on blur: leaving a field is not a
   statement about the field. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const el = e.target;
  if (!el || !el.dataset || el.dataset.act !== "roots") return;
  e.preventDefault();
  saveRoots(el.dataset.project, el.value);
});

async function saveRoots(projectId, value) {
  const roots = value.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    await api("PATCH", "/v1/config/projects/" + encodeURIComponent(projectId), { roots });
    // The field keeps the focus \u2014 somebody editing a path is usually not done \u2014
    // so the row is not rebuilt, and what it now considers unchanged is set here.
    const field = Array.prototype.find.call(
      document.querySelectorAll("[data-act=roots]"), (i) => i.dataset.project === projectId);
    if (field) {
      field.dataset.orig = field.value;
      const btn = Array.prototype.find.call(
        document.querySelectorAll("[data-act=save-roots]"), (b) => b.dataset.project === projectId);
      if (btn) btn.disabled = true;
    }
    await afterEdit(roots.length
      ? projectId + " is charged for work under " + roots.join(", ")
      : projectId + " now has no roots \u2014 nothing will be attributed to it");
  } catch (err) { flash(err.message, true); }
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest ? e.target.closest("[data-act]") : null;
  if (!el) return;
  const { act, project, account } = el.dataset;
  try {
    if (act === "refresh") return void refresh(true);

    /* Removing a project deletes its directories, its weights and its whole row
       from config.yaml, and one has already been lost to a single click here.
       So the name must be typed: a confirm dialog gets answered reflexively, a
       name does not. */
    if (act === "rm") {
      const p = (DATA.config.projects || {})[project] || {};
      const named = Object.keys(p.accounts || {});
      const typed = prompt(
        "Remove the project \"" + project + "\" from config.yaml?\n\n" +
        "This deletes its directories and its weights on " + (named.length ? named.join(", ") : "no accounts") + ". " +
        "Every other project naming those accounts gets a larger share.\n\n" +
        "Type the project name to confirm:");
      if (typed == null) return;
      if (typed.trim() !== project) return void flash("Nothing removed \u2014 that is not the project name.", true);
      await api("DELETE", "/v1/config/projects/" + encodeURIComponent(project));
      return void afterEdit("Removed " + project);
    }

    if (act === "toggle") {
      const to = el.dataset.to === "1";
      if (!to && !confirm(
        "Disable " + project + "?\n\nIt stops dispatching, and because it stops competing for its accounts, every " +
        "other project on them immediately gets a larger share. Its weights are kept.")) return;
      await api("PATCH", "/v1/config/projects/" + encodeURIComponent(project), { enabled: to });
      return void afterEdit((to ? "Enabled " : "Disabled ") + project);
    }

    if (act === "save-roots") {
      const field = Array.prototype.find.call(
        document.querySelectorAll("[data-act=roots]"), (i) => i.dataset.project === project);
      if (field) await saveRoots(project, field.value);
      return;
    }

    // --- the split -------------------------------------------------------
    if (act === "include") {
      // At 0, which takes nothing from anyone until a decision is made about it.
      const d = draftOf(account, true);
      delete d.drop[project];
      d.shares[project] = 0;
      renderSplit();
      const panel = panelFor(account);
      const slider = panel && Array.prototype.find.call(
        panel.querySelectorAll("[data-act=share]"), (i) => i.dataset.project === project);
      if (slider) slider.focus();
      return;
    }

    if (act === "unname") {
      const d = draftOf(account, true);
      delete d.shares[project];
      d.drop[project] = true;
      // What it held goes back to the rest, in proportion \u2014 and only in the
      // draft. The diff underneath says so before Apply does it.
      d.shares = round100(normalise(d.shares));
      return void renderSplit();
    }

    if (act === "keep") {
      const d = draftOf(account, true);
      delete d.drop[project];
      d.shares[project] = 0;
      d.shares = round100(normalise(d.shares));
      return void renderSplit();
    }

    if (act === "apply-split") return void applySplit(account);
    if (act === "cancel-split") { delete drafts[account]; return void renderSplit(); }

    if (act === "goto-split") {
      $("#h-split").scrollIntoView({ behavior: prefersStill() ? "auto" : "smooth", block: "start" });
      return;
    }

    if (act === "focus-roots") {
      const field = Array.prototype.find.call(
        document.querySelectorAll("[data-act=roots]"), (i) => i.dataset.project === project);
      if (!field) return;
      field.scrollIntoView({ behavior: prefersStill() ? "auto" : "smooth", block: "center" });
      field.focus();
      field.select();
      return;
    }

    if (act === "ledger") {
      if (panels.ledger[account]) { delete panels.ledger[account]; delete ledgers[account]; render(); return; }
      panels.ledger[account] = true;
      render();
      await loadLedger(account);
      return void render();
    }

    if (act === "why") return void loadWhy(project, account);
    if (act === "why-close") { panels.why = null; panels.whyData = null; return void render(); }
  } catch (err) { flash(err.message, true); }
});

function prefersStill() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/**
 * One form, two verbs.
 *
 * POST /v1/config/projects refuses a name that already exists, which is right
 * of it \u2014 creating over a project is how configuration gets lost \u2014 but it is no
 * reason to make somebody open a terminal to move a directory. So the form
 * decides which request it is, and falls back if it guessed from a config that
 * changed underneath it a moment ago.
 */
$("#add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#add-id").value.trim();
  const roots = $("#add-roots").value.split(",").map((s) => s.trim()).filter(Boolean);
  if (!id) return;
  const path = "/v1/config/projects/" + encodeURIComponent(id);
  try {
    if ((DATA.config.projects || {})[id]) {
      await api("PATCH", path, { roots });
    } else {
      try {
        await api("POST", "/v1/config/projects", { id, roots, accounts: {} });
      } catch (err) {
        if (String(err.message).indexOf("already exists") < 0) throw err;
        await api("PATCH", path, { roots });
      }
    }
    $("#add-id").value = "";
    $("#add-roots").value = "";
    delete $("#add-roots").dataset.auto;
    await afterEdit(id + " saved" + (roots.length ? "" : " \u2014 with no roots, nothing will be attributed to it"));
  } catch (err) { flash(err.message, true); }
});

// A background tab polling a loopback daemon forever is rude and pointless;
// coming back to a stale deck is worse, so it catches up on return instead.
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
timer = setInterval(() => { if (!document.hidden) refresh(); }, 30000);

clockSkew = DATA.meta.now - Math.floor(Date.now() / 1000);
render();
`;
function renderPage(o) {
  const accounts = accountViews(o);
  const projects2 = projectViews(o);
  const data = JSON.stringify({
    accounts,
    projects: projects2.map((p) => ({
      ...p,
      accounts: p.accounts.map((a) => ({
        ...a,
        weight: o.cfg.projects[p.projectId]?.accounts[a.accountId]?.weekly_share ?? 1
      }))
    })),
    config: { projects: o.cfg.projects, accounts: o.cfg.accounts },
    claims: openClaims(o.db),
    meta: {
      chain: o.cfg.policy.chain,
      claimLeaseSec: o.cfg.policy.claim_lease_sec,
      floorPct: o.cfg.policy.weekly.floor_pct,
      slackPct: o.cfg.policy.weekly.slack_pct,
      now: o.clock()
    }
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Overton</title>
<style>${STYLE}</style>
</head><body>
<div class="wrap">
  <header>
    <div class="mast">
      <h1 class="mark">overton</h1>
      <span class="tag">the range of dispatches currently acceptable</span>
      <span class="mast-r"><span id="stamp-host"></span><button id="refresh" data-act="refresh" type="button">Refresh</button></span>
    </div>
    <div class="mast-sub">${escapeHtml(o.configFile ?? "started without a config file \u2014 editing is refused rather than guessed")}</div>
  </header>

  <noscript><p class="note">This deck renders in the browser. Without JavaScript, use <code>overton status</code>, or the JSON at <code>/v1/accounts</code> and <code>/v1/projects</code>.</p></noscript>

  <main>
  <section aria-labelledby="h-now">
    <h2 id="h-now">Right now</h2>
    <div class="tiles" id="tiles"></div>
    <div id="attention"></div>
  </section>

  <section aria-labelledby="h-accounts">
    <h2 id="h-accounts">Accounts <span class="h2-note">used against elapsed \u2014 the hand is the clock</span></h2>
    <div class="cards" id="accounts"></div>
    <p class="note">
      A reading is only usable while it is <code>ok</code> or <code>stale</code>; <code>expired</code> and
      <code>unknown</code> cannot gate at all, and a degraded reading may only ever tighten a gate. The dotted
      tick is the account-wide stop, which no project's share can spend past. The 5-hour window is
      <code>burst</code> by default \u2014 a flat ceiling rather than a paced one \u2014 because it refills several times a day.
    </p>
  </section>

  <section aria-labelledby="h-split">
    <h2 id="h-split">The split <span class="h2-note">one account at a time \u2014 the 7-day window</span></h2>
    <div class="mixers" id="split"></div>
    <p class="note">
      Every account's week divides into three: what its projects may spend, what is <strong>held back for you</strong>,
      and the headroom above the account's own stop that nobody may touch. Weights are relative \u2014 they always divide
      the whole of what is left \u2014 so a slider going up is another one coming down, and the only way to leave capacity
      genuinely unallocated is to hold it back. A project at <code>0</code> is not a small share; it is a statement
      that it may never spend here, and the gate answers <code>deny</code>. Nothing is written to
      <code>config.yaml</code> until you apply it.
    </p>
  </section>

  <section aria-labelledby="h-alloc">
    <h2 id="h-alloc">Allocation <span class="h2-note">what the gate makes of it</span></h2>
    <div class="panel">
      <div class="tablewrap">
        <table class="grid" id="alloc">
          <thead><tr>
            <th>Account</th>
            <th class="n">Weight</th>
            <th class="n hide-sm">Share</th>
            <th>Used against the clock</th>
            <th class="n">Used / allowed</th>
            <th class="n">Pace</th>
            <th class="n hide-sm">At this rate</th>
            <th class="n">Verdict</th>
            <th class="n"><span class="sub">actions</span></th>
          </tr></thead>
          <tbody id="alloc-body"></tbody>
        </table>
      </div>
    </div>
    <div class="legend">
      <span class="item t-ok"><span class="mk">&#x2713;</span> go \u2014 dispatch</span>
      <span class="item t-warn"><span class="mk">~</span> wait \u2014 time fixes this</span>
      <span class="item t-warn"><span class="mk">?</span> ask \u2014 a human fixes this</span>
      <span class="item t-bad"><span class="mk">&#xd7;</span> deny \u2014 policy fixes this, never retry</span>
    </div>
    <p class="note">
      One group per project, so this is the other way round from <em>The split</em> above \u2014 and it is a readout,
      not a control: weights and shares are set there, where the redistribution they cause can be seen while it is
      being decided. The verdict is the whole policy chain, so a pairing can be on pace and still refused \u2014 ask
      <em>why</em> for the decision itself.
    </p>
  </section>

  <section aria-labelledby="h-claims">
    <h2 id="h-claims">Holding capacity</h2>
    <div class="panel" id="claims"></div>
  </section>

  <section aria-labelledby="h-add">
    <h2 id="h-add">Projects <span class="h2-note">a name and the directories it owns</span></h2>
    <form class="panel" id="add-form">
      <div class="add">
        <div>
          <label for="add-id">Name</label>
          <input type="text" id="add-id" placeholder="sideproject" list="project-names" autocomplete="off" required>
          <datalist id="project-names"></datalist>
        </div>
        <div>
          <label for="add-roots">Directories</label>
          <input type="text" id="add-roots" placeholder="~/Projects/sideproject, ~/Projects/other">
        </div>
        <button type="submit" class="primary" id="add-submit">Create project</button>
      </div>
      <p class="note" id="add-hint" style="padding: 0 14px 12px; margin: 0"></p>
    </form>
    <p class="note">
      Directories decide attribution: work whose path sits under one of them is charged to this project, longest
      root first. Naming a project that already exists updates it \u2014 the directories of every project are also
      editable in place, in the row above. Capacity is a separate question, and it is answered in <em>The split</em>.
    </p>
  </section>
  </main>

  <footer class="foot" id="foot"></footer>
</div>
<div id="flash" role="status" aria-live="polite"></div>
<script>window.__OVERTON__ = ${data};</script>
<script>${SCRIPT}</script>
</body></html>`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// packages/server/src/http.ts
function json2(body, status2 = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status: status2,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
function text(body, status2 = 200) {
  return new Response(body + `
`, { status: status2, headers: { "content-type": "text/plain; charset=utf-8" } });
}
function respondDecision(d, url) {
  if (url.searchParams.get("format") === "text")
    return text(renderDecision(d));
  return json2({ ...d, exitCode: EXIT_CODE[d.verdict] });
}
function resolve4(source) {
  return typeof source === "function" ? source() : source;
}
function createHandler(source) {
  return async function handle(req) {
    const o = resolve4(source);
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (req.method === "GET" && path === "/") {
      return new Response(renderPage(o), {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    if (req.method !== "GET" && req.headers.get("x-overton") !== "1") {
      return json2({ error: "writes require the `x-overton: 1` header" }, 403);
    }
    const configRoute = await handleConfig(o, req, path);
    if (configRoute)
      return configRoute;
    if (req.method === "GET" && path === "/v1/health") {
      return json2({
        ok: true,
        accounts: Object.keys(o.cfg.accounts).length,
        projects: Object.keys(o.cfg.projects).length,
        policies: o.cfg.policy.chain,
        now: o.clock()
      });
    }
    if (req.method === "GET" && path === "/v1/ask") {
      const project = url.searchParams.get("project");
      const account = url.searchParams.get("account");
      if (!project)
        return json2({ error: "missing `project`" }, 400);
      if (!account) {
        const all = o.askAll(project);
        if (url.searchParams.get("format") === "text") {
          return text(all.map(renderDecision).join(`

`));
        }
        return json2({ project, decisions: all });
      }
      return respondDecision(o.ask(project, account), url);
    }
    if (req.method === "POST" && path === "/v1/claim") {
      const body = await req.json().catch(() => null);
      if (!body?.project || !body?.account) {
        return json2({ error: "body must include `project` and `account`" }, 400);
      }
      const res = o.claim({ projectId: body.project, accountId: body.account, label: body.label ?? null, pid: body.pid ?? null }, { force: body.force === true });
      return json2({ decision: res.decision, claim: res.claim, forced: res.forced ?? false });
    }
    const claimAction = /^\/v1\/claim\/([^/]+)\/(renew|release)$/.exec(path);
    if (req.method === "POST" && claimAction) {
      const [, id, action] = claimAction;
      const ok = action === "renew" ? o.renew(id) : o.release(id);
      return ok ? json2({ ok: true, id }) : json2({ error: `no open claim \`${id}\`` }, 404);
    }
    if (req.method === "GET" && path === "/v1/accounts")
      return json2(accountViews(o));
    if (req.method === "GET" && path === "/v1/projects")
      return json2(projectViews(o));
    if (req.method === "GET" && path === "/v1/claims") {
      return json2(openClaims(o.db, url.searchParams.get("account") ?? undefined));
    }
    if (req.method === "GET" && path === "/v1/ledger") {
      const account = url.searchParams.get("account");
      if (!account)
        return json2({ error: "missing `account`" }, 400);
      return json2(ledgerView(o, account, url.searchParams.get("window") ?? undefined));
    }
    return json2({ error: `no route for ${req.method} ${path}` }, 404);
  };
}
function serve(source, opts = {}) {
  const handle = createHandler(source);
  const initial = resolve4(source);
  return Bun.serve({
    hostname: opts.host ?? initial.cfg.server.host,
    port: opts.port ?? initial.cfg.server.port,
    async fetch(req) {
      const res = await handle(req);
      opts.onRequest?.(req.method, new URL(req.url).pathname, res.status);
      return res;
    }
  });
}
// packages/server/src/mcp.ts
var PROTOCOL_VERSION = "2025-06-18";
var TOOLS = [
  {
    name: "overton_ask",
    description: "Ask whether a project may dispatch an agent on an account right now. Returns a verdict of " + "go / wait / ask / deny, the reason, and how long to wait. Omit `account` to get an answer " + "for every account the project may use, best first.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project id from Overton's config" },
        account: { type: "string", description: "Account id; omit to compare all eligible accounts" }
      },
      required: ["project"]
    },
    run: (o, a) => a.account ? o.ask(a.project, a.account) : o.askAll(a.project)
  },
  {
    name: "overton_explain",
    description: "The full set of facts behind a decision: window readings, freshness, allocation, points used, " + "elapsed fraction, open claims. Use this to understand a refusal rather than guessing at it.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        account: { type: "string" }
      },
      required: ["project", "account"]
    },
    run: (o, a) => o.facts(a.project, a.account)
  },
  {
    name: "overton_accounts",
    description: "Every account: provider, plan, window utilization, reset times, open claims.",
    inputSchema: { type: "object", properties: {} },
    run: (o) => accountViews(o)
  },
  {
    name: "overton_projects",
    description: "Every project's share, allocation, points used and pace on each account it may use.",
    inputSchema: { type: "object", properties: {} },
    run: (o) => projectViews(o)
  },
  {
    name: "overton_ledger",
    description: "How one account's window was actually spent, split by project, with the confidence of each " + "attribution and the vendor's own total for comparison.",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "string" },
        window: { type: "string", description: "seven_day (default) or five_hour" }
      },
      required: ["account"]
    },
    run: (o, a) => ledgerView(o, a.account, a.window)
  }
];
function handleRpc(o, req) {
  const reply = (result) => ({ jsonrpc: "2.0", id: req.id ?? null, result });
  const fail = (code, message) => ({
    jsonrpc: "2.0",
    id: req.id ?? null,
    error: { code, message }
  });
  switch (req.method) {
    case "initialize":
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "overton", version: "0.1.0" }
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return reply({
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
      });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === req.params?.name);
      if (!tool)
        return fail(-32602, `no tool named \`${req.params?.name}\``);
      try {
        const result = tool.run(o, req.params?.arguments ?? {});
        const pretty = result && typeof result === "object" && "verdict" in result ? renderDecision(result) : JSON.stringify(result, null, 2);
        return reply({ content: [{ type: "text", text: pretty }] });
      } catch (e) {
        return reply({ content: [{ type: "text", text: `error: ${e.message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `method not found: ${req.method}`);
  }
}
async function runMcpStdio(o) {
  const decoder = new TextDecoder;
  let buffer = "";
  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buffer.indexOf(`
`)) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line)
        continue;
      let req;
      try {
        req = JSON.parse(line);
      } catch {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + `
`);
        continue;
      }
      const res = handleRpc(o, req);
      if (res)
        process.stdout.write(JSON.stringify(res) + `
`);
    }
  }
}
// apps/overton/src/starter.ts
var STARTER_CONFIG = `# ~/.overton/config.yaml
#
# Overton decides who may spend, on whose budget, right now.
# Every account here is a symmetric row: there is no "current" account, and
# every request names the one it wants.

accounts:
  claude-personal:
    provider: anthropic
    config_dir: ~/.claude              # the profile whose credentials to read
    # plan: max                        # optional; the meter reports it anyway

    weekly_target_pct: 85              # account-wide stop, all projects
    five_hour_target_pct: 90
    interactive_reserve_pct: 15        # held back for YOUR terminal work
    max_concurrent: 6
    meter_interval_sec: 180

  # A second Claude seat. Same shape \u2014 that is the point.
  # claude-work:
  #   provider: anthropic
  #   config_dir: ~/.claude-profiles/work

  # codex-personal:
  #   provider: codex
  #   codex_home: ~/.codex

  # Local models: free capacity for the cheap high-volume roles.
  # ollama:
  #   provider: unmetered
  #   max_concurrent: 2

projects:
  # \`roots\` is how spend is matched to a project: a transcript whose working
  # directory is under one of these is charged here. Longest prefix wins, so a
  # monorepo package can be its own project.
  example:
    roots:
      - ~/Projects/example
    accounts:
      claude-personal:
        # A WEIGHT, not a percentage. Shares are normalised across every project
        # naming this account, so three projects at 1.0 get a third each and you
        # reroute capacity by changing one number.
        weekly_share: 1
        five_hour:
          # burst  no pacing, just a share of simultaneous capacity (default)
          # pace   pace the 5h window too
          # off    do not gate on the 5h window at all
          mode: burst

  # A side project that gets a fifth of the personal account and may never
  # touch a work one \u2014 expressed by simply not naming it.
  # sideproject:
  #   roots: [~/Projects/sideproject]
  #   accounts:
  #     claude-personal: { weekly_share: 0.25 }

policy:
  # Every policy rules on every request and the WORST verdict wins, so this
  # order affects only which of two equally severe refusals is reported.
  chain: [account-stop, reading-guard, allocation, concurrency]

  weekly:
    floor_pct: 0.15   # keeps the fleet moving the instant a window resets
    slack_pct: 0.05   # tolerance so one run cannot trip the gate

  freshness:
    stale_sec: 150         # a 5h reading older than this is stale
    week_stale_sec: 21600  # a weekly one barely moves; 6h is fine

  claim_lease_sec: 300     # a claim not renewed within this is reaped

server:
  host: 127.0.0.1   # loopback only. Expose with \`tailscale serve\`, not 0.0.0.0
  port: 7787

# Another machine's Overton, so one arbiter sees every machine's spend. With
# this set, every deciding and looking command asks THAT host instead of this
# database; metering, doctor and explain stay here and say so. An unreachable
# remote is an error, never a quiet answer from local data.
#
# remotes:
#   e16:
#     url: https://overton.my-tailnet.ts.net
# default_remote: e16      # only needed when there are several
`;

// apps/overton/src/commands/ops.ts
function mtimeOf(file) {
  try {
    return statSync4(file).mtimeMs;
  } catch {
    return 0;
  }
}
var meter = {
  async run(ctx) {
    const [only] = ctx.args.positional;
    const results = only ? [await ctx.overton.meterAccount(only)] : await ctx.overton.meter();
    const housekeeping = ctx.overton.tick();
    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify({ results, housekeeping }, null, 2) + `
`);
      return results.some((r) => r.error) ? 1 : 0;
    }
    const rows = results.map((r) => [
      r.accountId,
      r.error ? "ERROR" : r.reading ? "ok" : "no reading",
      r.reading ? Object.entries(r.reading.windows).map(([k, w]) => `${k.replace("seven_day", "7d").replace("five_hour", "5h")} ${w.utilizationPct.toFixed(0)}%`).join("  ") : "",
      Object.entries(r.attributed).map(([k, v]) => `${k} +${v.toFixed(2)}`).join(" ") || "\u2014",
      String(r.costEvents),
      r.rolled.length ? `rolled ${r.rolled.join(",")}` : "",
      r.error ?? ""
    ]);
    process.stdout.write(table(["ACCOUNT", "STATE", "WINDOWS", "ATTRIBUTED", "EVENTS", "EPOCH", "ERROR"], rows) + `
`);
    for (const r of results) {
      for (const u of r.uncorroborated) {
        process.stderr.write(`warning: ${r.accountId} ${u.kind} dropped ${u.from.toFixed(1)}% \u2192 ${u.to.toFixed(1)}% ` + `with no corroborating reset \u2014 treated as the same window
`);
      }
    }
    if (housekeeping.reaped) {
      process.stderr.write(`reaped ${housekeeping.reaped} claim(s) whose heartbeat stopped
`);
    }
    return results.some((r) => r.error) ? 1 : 0;
  }
};
var daemon = {
  async run(ctx) {
    let o = ctx.overton;
    const current = () => {
      reloadIfChanged();
      return o;
    };
    const configFile = typeof ctx.args.flags.config === "string" ? ctx.args.flags.config : ctx.paths.configFile;
    let configMtime = mtimeOf(configFile);
    const reloadIfChanged = () => {
      const mtime = mtimeOf(configFile);
      if (mtime === configMtime)
        return;
      configMtime = mtime;
      try {
        const cfg = loadConfig(configFile);
        o = new Overton({ db: o.db, cfg, configFile });
        process.stderr.write(`config reloaded: ${Object.keys(cfg.accounts).length} accounts, ${Object.keys(cfg.projects).length} projects
`);
      } catch (e) {
        process.stderr.write(`config reload FAILED, keeping the previous one: ${e.message}
`);
      }
    };
    const intervals = Object.values(o.cfg.accounts).filter((a) => a.enabled).map((a) => a.meter_interval_sec);
    const tickSec = intervals.length ? Math.min(...intervals) : 180;
    const server = ctx.args.flags["no-http"] ? null : serve(current, {
      onRequest: (m, p, s) => {
        if (ctx.args.flags.verbose)
          process.stderr.write(`${m} ${p} ${s}
`);
      }
    });
    if (server) {
      process.stderr.write(`overton http://${server.hostname}:${server.port}
`);
      process.stderr.write(`  expose it with: tailscale serve --bg --set-path /overton http://127.0.0.1:${server.port}
`);
    }
    process.stderr.write(`metering every ${humanDuration(tickSec)}
`);
    let running = true;
    const stop = () => {
      running = false;
      server?.stop();
      process.stderr.write(`
overton: stopped
`);
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    while (running) {
      try {
        const results = await current().meter();
        current().tick();
        for (const r of results) {
          if (r.error)
            process.stderr.write(`meter ${r.accountId}: ${r.error}
`);
        }
      } catch (e) {
        process.stderr.write(`tick failed: ${e.message}
`);
      }
      await Bun.sleep(tickSec * 1000);
    }
    return 0;
  }
};
var serveCmd = {
  async run(ctx) {
    const server = serve(ctx.overton, {
      onRequest: (m, p, s) => {
        if (ctx.args.flags.verbose)
          process.stderr.write(`${m} ${p} ${s}
`);
      }
    });
    process.stderr.write(`overton http://${server.hostname}:${server.port}
`);
    await new Promise(() => {});
    return 0;
  }
};
var mcp2 = {
  async run(ctx) {
    await runMcpStdio(ctx.overton);
    return 0;
  }
};
var doctor = {
  async run(ctx) {
    const results = await ctx.overton.doctor();
    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify(results, null, 2) + `
`);
      return results.some((r) => r.problems.length) ? 1 : 0;
    }
    let bad = 0;
    for (const r of results) {
      if (r.problems.length === 0) {
        process.stdout.write(`ok    ${r.accountId}
`);
        continue;
      }
      bad++;
      process.stdout.write(`FAIL  ${r.accountId}
`);
      for (const p of r.problems) {
        process.stdout.write(p.split(`
`).map((l) => `        ${l}`).join(`
`) + `
`);
      }
    }
    if (!results.length)
      process.stdout.write(`no enabled accounts in config
`);
    return bad ? 1 : 0;
  }
};
var init = {
  needsConfig: false,
  run(ctx) {
    const file = typeof ctx.args.flags.config === "string" ? ctx.args.flags.config : ctx.paths.configFile;
    if (existsSync(file) && !ctx.args.flags.force) {
      process.stderr.write(`${file} already exists \u2014 pass --force to overwrite
`);
      return 1;
    }
    mkdirSync(dirname2(file), { recursive: true });
    writeFileSync2(file, STARTER_CONFIG, { mode: 384 });
    process.stdout.write(`wrote ${file}

Next:
  $EDITOR ${file}
  overton doctor
  overton meter
  overton status
`);
    return 0;
  }
};
var opsCommands = {
  meter,
  daemon,
  serve: serveCmd,
  mcp: mcp2,
  doctor,
  init
};

// apps/overton/src/commands/paperclip.ts
import { spawnSync } from "child_process";
import { existsSync as existsSync2 } from "fs";
import { dirname as dirname3, join as join6, resolve as resolve5 } from "path";
var ADAPTER_TYPE = "overton";
function findAdapterDir(explicit) {
  if (explicit) {
    const dir = resolve5(explicit);
    if (!existsSync2(join6(dir, "package.json"))) {
      throw new Error(`no package.json under ${dir} \u2014 is that the adapter directory?`);
    }
    return dir;
  }
  let here = dirname3(new URL(import.meta.url).pathname);
  for (let i = 0;i < 8; i++) {
    const candidate = join6(here, "contrib", "paperclip-adapter");
    if (existsSync2(join6(candidate, "package.json")))
      return candidate;
    const up = dirname3(here);
    if (up === here)
      break;
    here = up;
  }
  throw new Error(`could not find contrib/paperclip-adapter
` + "  pass it explicitly:  overton paperclip install --path /path/to/adapter");
}
function run2(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  const out2 = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.error)
    return { ok: false, out: `${cmd} not found: ${r.error.message}` };
  return { ok: r.status === 0, out: out2 };
}
function have(bin) {
  return spawnSync("sh", ["-c", `command -v ${bin}`], { encoding: "utf8" }).status === 0;
}
function apiFlags(ctx) {
  const out2 = [];
  for (const name of ["api-base", "api-key", "profile", "context", "data-dir"]) {
    const v = ctx.args.flags[name];
    if (typeof v === "string" && v)
      out2.push(`--${name}`, v);
  }
  if (!ctx.args.flags["api-key"] && process.env.PAPERCLIP_API_KEY) {
    out2.push("--api-key", process.env.PAPERCLIP_API_KEY);
  }
  return out2;
}
function manualFallback(dir) {
  console.log("");
  console.log("Register it by hand instead \u2014 it takes about fifteen seconds:");
  console.log("  Paperclip \u2192 Adapters \u2192 Install External Adapter \u2192 Local path");
  console.log(`  ${dir}`);
  console.log("");
  console.log("Then restart Paperclip. `Reload` refreshes the registry row, but Node's ESM");
  console.log("cache keeps returning the module it imported first, so edits do not take");
  console.log("effect until the process restarts:");
  console.log("  systemctl --user restart paperclip    # or however you run it");
}
var installCommand = {
  needsConfig: false,
  run(ctx) {
    const dir = findAdapterDir(typeof ctx.args.flags.path === "string" ? ctx.args.flags.path : undefined);
    const skipBuild = ctx.args.flags["no-build"] === true;
    console.log(`adapter  ${dir}`);
    if (!skipBuild) {
      const pm = have("bun") ? "bun" : have("npm") ? "npm" : null;
      if (!pm) {
        console.error("neither bun nor npm is on PATH \u2014 cannot build the adapter");
        return 78;
      }
      process.stdout.write(`build    ${pm} install \u2026 `);
      const install = run2(pm, ["install"], dir);
      if (!install.ok) {
        console.log("failed");
        console.error(install.out.slice(0, 800));
        return 1;
      }
      const tsc = pm === "bun" ? run2("bunx", ["tsc"], dir) : run2("npx", ["tsc"], dir);
      if (!tsc.ok) {
        console.log("failed");
        console.error(tsc.out.slice(0, 800));
        return 1;
      }
      console.log("compiled");
    }
    if (!existsSync2(join6(dir, "dist", "index.js"))) {
      console.error(`no dist/index.js under ${dir} \u2014 the build produced nothing`);
      return 1;
    }
    if (!have("paperclipai")) {
      console.error("paperclipai is not on PATH, so the adapter cannot be registered for you.");
      manualFallback(dir);
      return 78;
    }
    const payload = typeof ctx.args.flags["payload-json"] === "string" ? ctx.args.flags["payload-json"] : JSON.stringify({ path: dir });
    process.stdout.write("register \u2026 ");
    const reg = run2("paperclipai", ["adapter", "install", "--payload-json", payload, ...apiFlags(ctx)]);
    if (!reg.ok) {
      console.log("failed");
      console.error(reg.out.slice(0, 900));
      if (/unauthor|forbidden|401|403|api.key/i.test(reg.out)) {
        console.error("");
        console.error("That looks like an auth failure. Paperclip's API needs a token:");
        console.error("  paperclipai auth login          # or: paperclipai token create");
        console.error("  export PAPERCLIP_API_KEY=\u2026      # then re-run this command");
      }
      manualFallback(dir);
      return 1;
    }
    console.log("done");
    const restart = ctx.args.flags.restart === true;
    if (restart) {
      process.stdout.write("restart  \u2026 ");
      const r = run2("systemctl", ["--user", "restart", "paperclip"]);
      console.log(r.ok ? "done" : "could not restart \u2014 do it yourself");
    }
    console.log("");
    console.log(`Registered as adapter type \`${ADAPTER_TYPE}\` \u2014 it shows up as`);
    console.log('"Overton (budget-gated)" in the agent form, with your real accounts');
    console.log("and their current utilization in the dropdown.");
    if (!restart) {
      console.log("");
      console.log("Restart Paperclip before using it \u2014 Node's ESM cache serves the module");
      console.log("it imported first:  overton paperclip install --restart   (or restart by hand)");
    }
    return 0;
  }
};
var statusCommand = {
  needsConfig: false,
  run(ctx) {
    if (!have("paperclipai")) {
      console.error("paperclipai is not on PATH");
      return 78;
    }
    const r = run2("paperclipai", ["adapter", "get", ADAPTER_TYPE, "--json", ...apiFlags(ctx)]);
    if (!r.ok) {
      console.log(`not registered \u2014 run \`overton paperclip install\``);
      if (r.out)
        console.error(r.out.slice(0, 400));
      return 1;
    }
    console.log(r.out);
    return 0;
  }
};
var paperclipCommand = {
  needsConfig: false,
  run(ctx) {
    const sub = ctx.args.positional[0];
    if (sub === "install")
      return installCommand.run(ctx);
    if (sub === "status")
      return statusCommand.run(ctx);
    console.log("overton paperclip \u2014 wire Overton into Paperclip");
    console.log("");
    console.log("  install    build the bundled adapter and register it");
    console.log("  status     is it registered?");
    console.log("");
    console.log("OPTIONS");
    console.log("  --path <dir>        adapter directory (default: bundled contrib/paperclip-adapter)");
    console.log("  --no-build          skip install+compile, register what is already built");
    console.log("  --restart           restart the paperclip systemd user service afterwards");
    console.log("  --api-key <token>   Paperclip API token (or $PAPERCLIP_API_KEY)");
    console.log("  --api-base <url>    a Paperclip other than the local one");
    return sub ? 2 : 0;
  }
};
var paperclipCommands = { paperclip: paperclipCommand };

// apps/overton/src/commands/project.ts
function parseAccountSpec(spec) {
  const eq = spec.indexOf("=");
  if (eq < 0)
    return [spec, 1];
  const weight = Number(spec.slice(eq + 1));
  if (!Number.isFinite(weight) || weight < 0) {
    throw new ConfigError(`\`${spec}\` \u2014 weight must be a number >= 0`);
  }
  return [spec.slice(0, eq), weight];
}
function listFlag(ctx, name) {
  const v = ctx.args.flags[name];
  if (typeof v !== "string")
    return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
function showSplit(ctx, projectId) {
  const cfg = ctx.overton.cfg;
  const fresh = new Overton({
    db: ctx.overton.db,
    cfg: ctx.overton.cfg,
    configFile: ctx.overton.configFile ?? undefined
  });
  process.stdout.write(renderSplit(projectViews(fresh), projectId) + `
`);
}
var ensure = {
  run(ctx) {
    const [projectId] = ctx.args.positional;
    if (!projectId) {
      process.stderr.write(`usage: overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,ID=WEIGHT]]
`);
      return 2;
    }
    if (!ctx.overton.configFile) {
      process.stderr.write(`no config file to edit
`);
      return 2;
    }
    const roots = listFlag(ctx, "root");
    const accounts = listFlag(ctx, "account").map(parseAccountSpec);
    for (const [accountId] of accounts) {
      if (!ctx.overton.cfg.accounts[accountId]) {
        process.stderr.write(`no account \`${accountId}\` \u2014 known: ${Object.keys(ctx.overton.cfg.accounts).join(", ")}
`);
        return 2;
      }
    }
    const existed = !!ctx.overton.cfg.projects[projectId];
    try {
      const cd = loadConfigDoc(ctx.overton.configFile);
      if (!existed) {
        addProject(cd, { id: projectId, roots, accounts: Object.fromEntries(accounts) });
      } else {
        if (roots.length) {
          const current = ctx.overton.cfg.projects[projectId].roots;
          const merged = [...new Set([...current, ...roots])];
          if (merged.length !== current.length)
            setProjectRoots(cd, projectId, merged);
        }
        for (const [accountId, weight] of accounts)
          setShare(cd, projectId, accountId, weight);
      }
      saveConfigDoc(cd);
    } catch (e) {
      process.stderr.write(`${e.message}
`);
      return 1;
    }
    process.stdout.write(`${existed ? "updated" : "created"} project \`${projectId}\`` + (roots.length ? ` \xB7 roots ${roots.join(", ")}` : "") + (accounts.length ? ` \xB7 ${accounts.map(([a, w]) => `${a}=${w}`).join(" ")}` : "") + `

`);
    if (!roots.length && !existed) {
      process.stdout.write("note: no --root given, so nothing will be attributed to this project. " + `Spend from a directory you have not declared lands in @interactive.

`);
    }
    showSplit(ctx, projectId);
    return 0;
  }
};
var rm = {
  run(ctx) {
    const [projectId] = ctx.args.positional;
    if (!projectId) {
      process.stderr.write(`usage: overton project rm <id>
`);
      return 2;
    }
    if (!ctx.overton.configFile) {
      process.stderr.write(`no config file to edit
`);
      return 2;
    }
    try {
      const cd = loadConfigDoc(ctx.overton.configFile);
      removeProject(cd, projectId);
      saveConfigDoc(cd);
    } catch (e) {
      process.stderr.write(`${e.message}
`);
      return 1;
    }
    process.stdout.write(`removed \`${projectId}\` \u2014 its allocation returns to the other projects

`);
    showSplit(ctx, projectId);
    return 0;
  }
};
var projectCommand = {
  run(ctx) {
    const sub = ctx.args.positional.shift();
    if (sub === "ensure" || sub === "add")
      return ensure.run(ctx);
    if (sub === "rm" || sub === "remove")
      return rm.run(ctx);
    if (!sub || sub === "ls" || sub === "list") {
      const ids2 = Object.keys(ctx.overton.cfg.projects);
      process.stdout.write(ids2.length ? ids2.join(`
`) + `
` : `no projects configured
`);
      return 0;
    }
    process.stderr.write(`unknown subcommand \`${sub}\`

` + `usage:
` + `  overton project ls
` + `  overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,\u2026]]
` + `  overton project rm <id>
`);
    return 2;
  }
};

// apps/overton/src/commands/index.ts
var COMMANDS = {
  ...askCommands,
  ...lookCommands,
  ...opsCommands,
  ...paperclipCommands,
  project: projectCommand
};

// apps/overton/src/remote/client.ts
var TIMEOUT_MS = 1e4;

class RemoteError extends Error {
  status;
  constructor(message, status2 = null) {
    super(message);
    this.name = "RemoteError";
    this.status = status2;
  }
}
function detailOf(body) {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed.error === "string")
      return parsed.error;
  } catch {}
  return body.trim().slice(0, 300) || "(empty body)";
}

class RemoteOverton {
  baseUrl;
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  async call(path, init2) {
    let res;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init2,
        headers: { ...init2?.headers, "x-overton": "1" },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch (e) {
      throw new RemoteError(`${this.baseUrl} is unreachable: ${e.message}`);
    }
    const body = await res.text();
    if (!res.ok) {
      throw new RemoteError(`${this.baseUrl} returned HTTP ${res.status} for ${path}: ${detailOf(body)}`, res.status);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new RemoteError(`${this.baseUrl} answered ${path} with something that is not JSON: ${body.trim().slice(0, 200)}
` + "  is that URL really an Overton? A reverse proxy that swallowed the path answers like this.");
    }
  }
  send(method, path, body) {
    return this.call(path, {
      method,
      ...body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
    });
  }
  health() {
    return this.call("/v1/health");
  }
  ask(project, account) {
    const q = new URLSearchParams({ project, account });
    return this.call(`/v1/ask?${q}`);
  }
  askAll(project) {
    const q = new URLSearchParams({ project });
    return this.call(`/v1/ask?${q}`);
  }
  accounts() {
    return this.call("/v1/accounts");
  }
  projects() {
    return this.call("/v1/projects");
  }
  claims(account) {
    const q = account ? `?${new URLSearchParams({ account })}` : "";
    return this.call(`/v1/claims${q}`);
  }
  ledger(account, window) {
    const q = new URLSearchParams({ account });
    if (window)
      q.set("window", window);
    return this.call(`/v1/ledger?${q}`);
  }
  config() {
    return this.call("/v1/config");
  }
  claim(body) {
    return this.send("POST", "/v1/claim", body);
  }
  renew(id) {
    return this.send("POST", `/v1/claim/${encodeURIComponent(id)}/renew`);
  }
  release(id) {
    return this.send("POST", `/v1/claim/${encodeURIComponent(id)}/release`);
  }
  addProject(body) {
    return this.send("POST", "/v1/config/projects", body);
  }
  setProjectRoots(project, roots) {
    return this.send("PATCH", `/v1/config/projects/${encodeURIComponent(project)}`, { roots });
  }
  setShare(project, account, weight) {
    const path = `/v1/config/projects/${encodeURIComponent(project)}/accounts/${encodeURIComponent(account)}`;
    return this.send("PUT", path, { weight });
  }
  removeProject(project) {
    return this.send("DELETE", `/v1/config/projects/${encodeURIComponent(project)}`);
  }
}

// apps/overton/src/remote/target.ts
function describeTarget(t) {
  return `${t.name ?? "(unnamed)"} ${t.url}`;
}
function targetHost(t) {
  return new URL(t.url).hostname;
}
var LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
function normalizeRemoteUrl(raw, where) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed)
    throw new ConfigError(`${where}: a remote needs a URL`);
  const authority = trimmed.split("/")[0];
  const withScheme = /:\/\//.test(trimmed) ? trimmed : `${LOOPBACK.test(authority) ? "http" : "https"}://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(`\`${u.protocol}\` is not http or https`);
    }
  } catch (e) {
    throw new ConfigError(`${where}: \`${raw}\` is not a usable URL \u2014 ${e.message}`);
  }
  return withScheme;
}
function fromRef(ref, source, config2) {
  if (/:\/\//.test(ref))
    return { name: null, url: normalizeRemoteUrl(ref, source), source };
  const remotes = config2().remotes ?? {};
  const entry = remotes[ref];
  if (!entry) {
    const known = Object.keys(remotes);
    throw new ConfigError(`${source}: no remote named \`${ref}\`
` + (known.length ? `  configured: ${known.join(", ")}
` : `  no remotes are configured
`) + "  fix: name one of those, add it under `remotes:` in config.yaml, " + "or pass a full URL like https://host.ts.net");
  }
  return { name: ref, url: normalizeRemoteUrl(entry.url, `remotes.${ref}.url`), source };
}
function resolveRemote(sources2) {
  const { flag, env, config: config2 } = sources2;
  if (flag === true) {
    throw new ConfigError("--remote needs a name or a URL, e.g. `--remote e16` or `--remote https://host.ts.net`");
  }
  if (typeof flag === "string" && flag.trim())
    return fromRef(flag.trim(), "--remote", config2);
  const fromEnv = (env?.OVERTON_REMOTE ?? "").trim();
  if (fromEnv)
    return fromRef(fromEnv, "OVERTON_REMOTE", config2);
  const cfg = config2();
  const remotes = cfg.remotes ?? {};
  const names = Object.keys(remotes);
  if (cfg.default_remote) {
    return {
      name: cfg.default_remote,
      url: normalizeRemoteUrl(remotes[cfg.default_remote].url, `remotes.${cfg.default_remote}.url`),
      source: "config"
    };
  }
  if (names.length === 1) {
    const only = names[0];
    return { name: only, url: normalizeRemoteUrl(remotes[only].url, `remotes.${only}.url`), source: "config" };
  }
  if (cfg.remote?.trim()) {
    return { name: null, url: normalizeRemoteUrl(cfg.remote, "remote"), source: "config" };
  }
  return null;
}

// apps/overton/src/remote/commands.ts
function emit2(ctx, value, prose) {
  if (ctx.args.flags.json)
    process.stdout.write(JSON.stringify(value, null, 2) + `
`);
  else
    process.stdout.write(prose() + `
`);
  return 0;
}
var ask2 = async (ctx) => {
  const [project, account] = ctx.args.positional;
  if (!project) {
    process.stderr.write(`usage: overton ask <project> [account]
`);
    return 2;
  }
  if (!account) {
    const { decisions } = await ctx.remote.askAll(project);
    if (!decisions.length) {
      process.stderr.write(`${project} names no accounts in config
`);
      return 2;
    }
    emit2(ctx, decisions, () => decisions.map(renderDecision).join(`

`));
    return EXIT_CODE[decisions[0].verdict];
  }
  const { exitCode, ...decision2 } = await ctx.remote.ask(project, account);
  emit2(ctx, decision2, () => renderDecision(decision2));
  return exitCode;
};
function claimBody(ctx, label) {
  return {
    project: ctx.args.positional[0],
    account: ctx.args.positional[1],
    label,
    force: ctx.args.flags.force === true
  };
}
var claim2 = async (ctx) => {
  const [project, account] = ctx.args.positional;
  if (!project || !account) {
    process.stderr.write(`usage: overton claim <project> <account> [--label X] [--force]
`);
    return 2;
  }
  const res = await ctx.remote.claim(claimBody(ctx, typeof ctx.args.flags.label === "string" ? ctx.args.flags.label : null));
  if (ctx.args.flags.json) {
    const value = res.claim ? { decision: res.decision, claim: res.claim, forced: res.forced } : { decision: res.decision, claim: null };
    process.stdout.write(JSON.stringify(value, null, 2) + `
`);
  } else if (res.claim) {
    process.stdout.write(`${res.claim.id}
` + (res.forced ? `  FORCED past: ${res.decision.summary}
` : ""));
  } else {
    process.stdout.write(renderDecision(res.decision) + `
`);
  }
  return res.claim ? 0 : EXIT_CODE[res.decision.verdict];
};
var renew2 = async (ctx) => {
  const [id] = ctx.args.positional;
  if (!id) {
    process.stderr.write(`usage: overton renew <claim-id>
`);
    return 2;
  }
  try {
    await ctx.remote.renew(id);
    return 0;
  } catch (e) {
    if (e instanceof RemoteError && e.status === 404) {
      process.stderr.write(`no open claim \`${id}\` \u2014 it may have been reaped
`);
      return 1;
    }
    throw e;
  }
};
var release2 = async (ctx) => {
  const [id] = ctx.args.positional;
  if (!id) {
    process.stderr.write(`usage: overton release <claim-id>
`);
    return 2;
  }
  try {
    await ctx.remote.release(id);
    return 0;
  } catch (e) {
    if (e instanceof RemoteError && e.status === 404) {
      process.stderr.write(`no open claim \`${id}\`
`);
      return 1;
    }
    throw e;
  }
};
var run3 = async (ctx) => {
  const [project, account] = ctx.args.positional;
  if (!project || !account || ctx.args.rest.length === 0) {
    process.stderr.write(`usage: overton run <project> <account> -- <command>...
`);
    return 2;
  }
  const cfg = await ctx.remote.config();
  const res = await ctx.remote.claim(claimBody(ctx, ctx.args.rest.join(" ").slice(0, 120)));
  if (!res.claim) {
    process.stderr.write(renderDecision(res.decision) + `
`);
    return EXIT_CODE[res.decision.verdict];
  }
  const id = res.claim.id;
  const beat = setInterval(() => {
    ctx.remote.renew(id).catch((e) => {
      process.stderr.write(`overton: heartbeat failed: ${e.message}
`);
    });
  }, Math.max(5, cfg.policy.claim_lease_sec / 3) * 1000);
  try {
    const proc = Bun.spawn(ctx.args.rest, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
    return await proc.exited;
  } finally {
    clearInterval(beat);
    await ctx.remote.release(id).catch((e) => {
      process.stderr.write(`overton: could not release ${id}: ${e.message}
`);
    });
  }
};
var status2 = async (ctx) => {
  const [accounts, projects2] = await Promise.all([ctx.remote.accounts(), ctx.remote.projects()]);
  return emit2(ctx, { accounts, projects: projects2 }, () => renderStatus(accounts, projects2));
};
var windows2 = async (ctx) => {
  const [only] = ctx.args.positional;
  const accounts = (await ctx.remote.accounts()).filter((a) => !only || a.accountId === only);
  return emit2(ctx, accounts, () => renderWindows(accounts));
};
var projects2 = async (ctx) => {
  const views2 = await ctx.remote.projects();
  return emit2(ctx, views2, () => renderProjects(views2));
};
var ledger2 = async (ctx) => {
  const [account] = ctx.args.positional;
  if (!account) {
    process.stderr.write(`usage: overton ledger <account> [--window seven_day|five_hour]
`);
    return 2;
  }
  const view = await ctx.remote.ledger(account, typeof ctx.args.flags.window === "string" ? ctx.args.flags.window : undefined);
  return emit2(ctx, view, () => renderLedger(view));
};
var claims3 = async (ctx) => {
  const account = typeof ctx.args.flags.account === "string" ? ctx.args.flags.account : undefined;
  const [rows, health] = await Promise.all([ctx.remote.claims(account), ctx.remote.health()]);
  return emit2(ctx, rows, () => renderClaims(rows, health.now));
};
function parseAccountSpec2(spec) {
  const eq = spec.indexOf("=");
  if (eq < 0)
    return [spec, 1];
  const weight = Number(spec.slice(eq + 1));
  if (!Number.isFinite(weight) || weight < 0)
    return null;
  return [spec.slice(0, eq), weight];
}
function listFlag2(ctx, name) {
  const v = ctx.args.flags[name];
  if (typeof v !== "string")
    return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
var project = async (ctx) => {
  const sub = ctx.args.positional.shift();
  if (sub === "ensure" || sub === "add")
    return projectEnsure(ctx);
  if (sub === "rm" || sub === "remove")
    return projectRm(ctx);
  if (!sub || sub === "ls" || sub === "list") {
    const cfg = await ctx.remote.config();
    const ids2 = Object.keys(cfg.projects);
    process.stdout.write(ids2.length ? ids2.join(`
`) + `
` : `no projects configured
`);
    return 0;
  }
  process.stderr.write(`unknown subcommand \`${sub}\`

` + `usage:
` + `  overton project ls
` + `  overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,\u2026]]
` + `  overton project rm <id>
`);
  return 2;
};
async function projectEnsure(ctx) {
  const [projectId] = ctx.args.positional;
  if (!projectId) {
    process.stderr.write(`usage: overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,ID=WEIGHT]]
`);
    return 2;
  }
  const roots = listFlag2(ctx, "root");
  const accounts = [];
  for (const spec of listFlag2(ctx, "account")) {
    const parsed = parseAccountSpec2(spec);
    if (!parsed) {
      process.stderr.write(`\`${spec}\` \u2014 weight must be a number >= 0
`);
      return 1;
    }
    accounts.push(parsed);
  }
  const cfg = await ctx.remote.config();
  for (const [accountId] of accounts) {
    if (!cfg.accounts[accountId]) {
      process.stderr.write(`no account \`${accountId}\` \u2014 known: ${Object.keys(cfg.accounts).join(", ")}
`);
      return 2;
    }
  }
  const existing = cfg.projects[projectId];
  let result = null;
  try {
    if (!existing) {
      result = await ctx.remote.addProject({ id: projectId, roots, accounts: Object.fromEntries(accounts) });
    } else {
      if (roots.length) {
        const merged = [...new Set([...existing.roots, ...roots])];
        if (merged.length !== existing.roots.length)
          result = await ctx.remote.setProjectRoots(projectId, merged);
      }
      for (const [accountId, weight] of accounts) {
        result = await ctx.remote.setShare(projectId, accountId, weight);
      }
    }
  } catch (e) {
    if (e instanceof RemoteError && e.status != null) {
      process.stderr.write(`${e.message}
`);
      return 1;
    }
    throw e;
  }
  process.stdout.write(`${existing ? "updated" : "created"} project \`${projectId}\`` + (roots.length ? ` \xB7 roots ${roots.join(", ")}` : "") + (accounts.length ? ` \xB7 ${accounts.map(([a, w]) => `${a}=${w}`).join(" ")}` : "") + `

`);
  if (!roots.length && !existing) {
    process.stdout.write("note: no --root given, so nothing will be attributed to this project. " + `Spend from a directory you have not declared lands in @interactive.

`);
  }
  process.stdout.write(renderSplit(result?.projects ?? await ctx.remote.projects(), projectId) + `
`);
  return 0;
}
async function projectRm(ctx) {
  const [projectId] = ctx.args.positional;
  if (!projectId) {
    process.stderr.write(`usage: overton project rm <id>
`);
    return 2;
  }
  let result;
  try {
    result = await ctx.remote.removeProject(projectId);
  } catch (e) {
    if (e instanceof RemoteError && e.status != null) {
      process.stderr.write(`${e.message}
`);
      return 1;
    }
    throw e;
  }
  process.stdout.write(`removed \`${projectId}\` \u2014 its allocation returns to the other projects

`);
  process.stdout.write(renderSplit(result.projects, projectId) + `
`);
  return 0;
}
var REMOTE_COMMANDS = {
  ask: ask2,
  claim: claim2,
  renew: renew2,
  release: release2,
  run: run3,
  status: status2,
  windows: windows2,
  projects: projects2,
  ledger: ledger2,
  claims: claims3,
  project
};
var LOCAL_ONLY = {
  explain: {
    why: "the facts behind a decision are not on the HTTP surface \u2014 a remote can say what it decided, not show its working",
    where: "host"
  },
  meter: {
    why: "metering polls the vendors with the credentials on the machine it runs on, and writes that machine's ledger",
    where: "host"
  },
  daemon: { why: "the daemon owns a database and binds a port", where: "host" },
  serve: { why: "serving means binding a port to a local database", where: "host" },
  mcp: { why: "the MCP server answers from the database in the process running it", where: "host" },
  doctor: { why: "doctor checks the provider credentials on the machine it runs on", where: "host" },
  plugins: {
    why: "the plugin registry belongs to the binary that loaded it, and is not on the HTTP surface",
    where: "host"
  },
  init: { why: "init writes this machine's config file", where: "here" },
  paperclip: { why: "the adapter is built and registered on this machine", where: "here" }
};
function refuseLocalOnly(command, target) {
  const entry = LOCAL_ONLY[command];
  const why = entry?.why ?? "it has no remote equivalent";
  const fix = entry?.where === "here" ? `  fix: it is about this machine, so drop the remote (${target.source}) and run it again` : `  fix: run it on the arbiter itself \u2014 ssh ${targetHost(target)} overton ${command} \u2026`;
  process.stderr.write(`overton: \`${command}\` cannot run against a remote Overton (${describeTarget(target)})
` + `  ${why}
${fix}
`);
  return 2;
}
function banner(target) {
  const line = `overton \xB7 ${describeTarget(target)}`;
  process.stderr.write(process.stderr.isTTY ? `\x1B[2m${line}\x1B[0m
` : `${line}
`);
}
async function runRemote(target, args) {
  const command = REMOTE_COMMANDS[args.command];
  if (!command)
    return refuseLocalOnly(args.command, target);
  if (!args.flags.json)
    banner(target);
  const ctx = { args, remote: new RemoteOverton(target.url), target };
  try {
    return await command(ctx);
  } catch (e) {
    if (e instanceof RemoteError) {
      process.stderr.write(`overton: ${e.message}
` + `  the remote (${describeTarget(target)}, from ${target.source}) is where this question had to go,
` + `  so nothing was answered from this machine's database.
`);
      return 1;
    }
    throw e;
  }
}

// apps/overton/src/index.ts
var USAGE = `overton \u2014 a quota arbiter for coding agents

  The Overton window: the range of dispatches currently acceptable.

USAGE
  overton <command> [options]

DECIDING
  ask <project> [account]     may this project spend here right now?
  claim <project> <account>   ask, and hold capacity if the answer is go
  renew <claim-id>            heartbeat an open claim
  release <claim-id>          close a claim
  run <project> <account> -- <cmd>...
                              ask, hold a claim, run the command, release

LOOKING
  status                      accounts, windows, claims, at a glance
  windows [account]           what each account's meter says
  projects                    each project's share, allocation and pace
  project ls | ensure | rm    list, create/update, or remove a project
  ledger <account>            how a window was actually spent, by project
  explain <project> <account> every fact behind a decision
  claims [--account A]        what is holding capacity
  plugins                     registered providers, cost sources, policies

RUNNING
  meter [account]             poll providers, attribute the delta, once
  daemon                      meter on a loop, and serve HTTP
  serve                       HTTP only
  mcp                         MCP server on stdio
  doctor                      check config and credentials
  init                        write a starter config

INTEGRATING
  paperclip install           build the bundled Paperclip adapter and register it
  paperclip status            is the adapter registered?

OPTIONS
  --json                      machine-readable output
  --remote <name|url>         ask another machine's Overton instead of this one
  --config <path>             config file (default ~/.overton/config.yaml)
  --home <path>               state directory (default ~/.overton)

REMOTE
  One arbiter can answer for every machine sharing a subscription. Point this
  CLI at it with --remote, $OVERTON_REMOTE, or a remotes: block in config; a
  name resolves through that block, anything with :// is used as given.

  meter, daemon, serve, mcp, doctor, plugins, init, paperclip and explain stay
  local and say so. A remote that cannot be reached is an error \u2014 no question
  is ever quietly answered from this machine's database instead.

EXIT CODES
  ask and claim exit 0 go \xB7 10 wait \xB7 11 ask \xB7 12 deny, so a shell can branch
  on the verdict without parsing prose.
`;
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  const rest = [];
  let afterDoubleDash = false;
  for (let i = 0;i < argv.length; i++) {
    const a = argv[i];
    if (afterDoubleDash) {
      rest.push(a);
      continue;
    }
    if (a === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const name = a.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("-") && !BOOLEAN_FLAGS.has(name)) {
          flags[name] = next;
          i++;
        } else {
          flags[name] = true;
        }
      }
      continue;
    }
    positional.push(a);
  }
  return { command: positional.shift() ?? "", positional, flags, rest };
}
var BOOLEAN_FLAGS = new Set(["json", "help", "version", "force", "watch", "all", "once", "verbose"]);
async function main(argv) {
  const args = parseArgs(argv);
  if (!args.command || args.flags.help || args.command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  const command = COMMANDS[args.command];
  if (!command) {
    process.stderr.write(`unknown command \`${args.command}\`

Run \`overton help\`.
`);
    return 2;
  }
  const paths2 = new Paths(typeof args.flags.home === "string" ? args.flags.home : Paths.fromEnv().home);
  const configFile = typeof args.flags.config === "string" ? args.flags.config : paths2.configFile;
  let loaded = null;
  const config2 = () => loaded ??= loadConfig(configFile);
  let overton2;
  try {
    const optional = () => {
      try {
        return config2();
      } catch {
        return {};
      }
    };
    const remoteConfig = command.needsConfig === false ? optional : config2;
    const target = resolveRemote({
      flag: args.flags.remote,
      env: process.env,
      config: remoteConfig
    });
    if (target)
      return await runRemote(target, args);
    if (command.needsConfig === false)
      return command.run({ args, paths: paths2 });
    overton2 = new Overton({ db: openDb(paths2.dbFile), cfg: config2(), configFile });
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`${e.message}
`);
      return 2;
    }
    throw e;
  }
  return command.run({ args, paths: paths2, overton: overton2 });
}
var code = await main(process.argv.slice(2)).catch((e) => {
  process.stderr.write(`overton: ${e.message}
`);
  return 1;
});
process.exit(code);
export {
  parseArgs,
  EXIT_CODE
};
