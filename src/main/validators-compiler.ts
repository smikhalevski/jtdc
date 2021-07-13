import {JtdNode} from './jtd-ast-types';
import {IJtdcDialect} from './dialect-types';
import {visitJtdNode} from './jtd-visitor';
import _, {compileTsSource, IFragmentCgNode} from '@smikhalevski/codegen';
import createJtdDialect from './jtd-dialect';

export interface IValidatorCompilerOptions<M, C> {

  /**
   * If set to `true` then type guards are rendered along with validators.
   *
   * @see {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html TypeScript Narrowing}
   */
  typeGuardsRendered?: boolean;

  /**
   * The validator compilation dialect that describes how validators and type guards are compiled.
   */
  dialect?: IJtdcDialect<M, C>;
}

/**
 * Compiles validators and type guards from the definitions.
 */
export function compileValidators<M, C>(definitions: Record<string, JtdNode<M>>, options?: IValidatorCompilerOptions<M, C>): string {
  const opt = {...validatorCompilerOptions, ...options};

  const {
    typeGuardsRendered,
    dialect,
  } = opt;

  let src = '';

  for (const [ref, node] of Object.entries(definitions)) {
    src += compileTsSource(dialect.validator(ref, node, (ctx) => compileValidatorBody(node, ctx, dialect)));

    if (typeGuardsRendered) {
      src += compileTsSource(dialect.typeGuard(ref, node));
    }
  }
  return src;
}

function compileValidatorBody<M, C>(node: JtdNode<M>, ctx: C, dialect: IJtdcDialect<M, C>): IFragmentCgNode {
  let frags: Array<IFragmentCgNode> = [];

  const createNext = (next: () => void) => (nextCtx: C) => {
    const prevFrags = frags;
    const prevCtx = ctx;

    frags = [];
    ctx = nextCtx;
    next();

    const nextFrag = _(frags);

    frags = prevFrags;
    ctx = prevCtx;

    return nextFrag;
  };

  visitJtdNode(node, {
    ref(node) {
      frags.push(dialect.ref(node, ctx));
    },
    nullable(node, next) {
      frags.push(dialect.nullable(node, ctx, createNext(next)));
    },
    type(node) {
      frags.push(dialect.type(node, ctx));
    },
    enum(node) {
      frags.push(dialect.enum(node, ctx));
    },
    elements(node, next) {
      frags.push(dialect.elements(node, ctx, createNext(next)));
    },
    values(node, next) {
      frags.push(dialect.values(node, ctx, createNext(next)));
    },
    object(node, next) {
      frags.push(dialect.object(node, ctx, createNext(next)));
    },
    property(propKey, propNode, objectNode, next) {
      frags.push(dialect.property(propKey, propNode, objectNode, ctx, createNext(next)));
    },
    optionalProperty(propKey, propNode, objectNode, next) {
      frags.push(dialect.optionalProperty(propKey, propNode, objectNode, ctx, createNext(next)));
    },
    union(node, next) {
      frags.push(dialect.union(node, ctx, createNext(next)));
    },
    mapping(mappingKey, mappingNode, unionNode, next) {
      frags.push(dialect.mapping(mappingKey, mappingNode, unionNode, ctx, createNext(next)));
    },
  });

  return _(frags);
}

export const validatorCompilerOptions: Required<IValidatorCompilerOptions<any, any>> = {
  typeGuardsRendered: false,
  dialect: createJtdDialect(),
};
