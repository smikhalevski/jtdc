import {IJtdMap} from './jtd-types';
import {
  compileTsFromJtdDefinitions,
  IJtdTsOptions,
  IJtdTsRenameOptions,
  ITsJtdMetadata,
  jtdTsOptions,
  renameRef,
} from './jtd-ts';
import {parseJtdDefinitions} from './jtd-ast';
import {IJtdNodeMap, JtdNode} from './jtd-ast-types';
import {compileValidatorModuleProlog, compileValidators, IValidatorOptions, jtdValidatorOptions} from './validator';
import {TYPE_VALIDATOR, VAR_RUNTIME} from './validator/runtime-naming';

export interface IJtdTsModulesOptions<Metadata> extends Partial<Omit<IJtdTsOptions<Metadata> & IValidatorOptions<Metadata>, 'resolveRef'>> {

  /**
   * If set to `true` then validator functions are emitted along with type.
   *
   * @default false
   */
  emitsValidators?: boolean;

  /**
   * Arbitrary TS source prepended to modules after imports.
   */
  prependedSource?: string;
}

export function compileJtdTsModules<Metadata extends ITsJtdMetadata>(modules: Record<string, IJtdMap<Metadata>>, options?: IJtdTsModulesOptions<Metadata>): Record<string, string> {
  const moduleMap: Record<string, string> = Object.create(null);

  const parsedModules: Array<{ uri: string, definitions: IJtdNodeMap<Metadata>, exports: Record<string, string> }> = [];

  const opts = Object.assign({}, jtdValidatorOptions, jtdTsOptions, options);

  for (const uri of Object.keys(modules)) {
    const definitions = parseJtdDefinitions(modules[uri]);

    parsedModules.push({
      uri,
      definitions,
      exports: getExports(definitions, opts),
    });
  }

  for (const {uri, definitions, exports} of parsedModules) {

    const imports: Record<string, Map<string, { node: JtdNode<Metadata>, name: string }>> = Object.create(null);

    // Cross-module ref resolver
    opts.resolveRef = (ref, node) => {
      for (const {uri, exports} of parsedModules) {
        if (ref in exports) {

          const name = exports[ref];
          const names = imports[uri] ||= new Map();

          names.set(ref, {node, name});

          return name;
        }
      }
      throw new Error('Unresolved reference: ' + ref);
    };

    const typeSource = compileTsFromJtdDefinitions(definitions, opts);

    let source = opts.prependedSource || '';

    for (const [uri, names] of Object.entries(imports)) {
      source += 'import {' +
          Array.from(names.values()).map((v) => v.name).join(',');

      if (opts.emitsValidators) {
        source += ',' + Array.from(names.entries()).map(([ref, v]) => opts.renameValidator(ref, v.node)).join(',');
      }

      source += `} from ${JSON.stringify(uri)};`;
    }

    if (opts.emitsValidators) {
      source += `import ${VAR_RUNTIME}, {Validator as ${TYPE_VALIDATOR}} from "../validator/runtime";`
          + compileValidatorModuleProlog(VAR_RUNTIME);
    }

    source += typeSource;

    if (opts.emitsValidators) {
      opts.resolveRef = (ref) => exports[ref];
      source += compileValidators(definitions, opts);
    }

    moduleMap[uri] = source;
  }

  return moduleMap;
}

/**
 * Returns map from ref to a TS type name.
 */
function getExports<Metadata>(definitions: IJtdNodeMap<Metadata>, options: IJtdTsRenameOptions<Metadata>): Record<string, string> {
  const exports: Record<string, string> = Object.create(null);

  for (const [ref, node] of Object.entries(definitions)) {
    exports[ref] = renameRef(ref, node, options);
  }
  return exports;
}
