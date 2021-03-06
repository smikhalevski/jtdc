/**
 * JTD standard data types.
 */
export const enum JtdType {
  BOOLEAN = 'boolean',
  STRING = 'string',

  /**
   * JSON strings containing an RFC3339 timestamp.
   *
   * ```ts
   * "1985-04-12T23:20:50.52Z"
   * ```
   */
  TIMESTAMP = 'timestamp',
  FLOAT32 = 'float32',
  FLOAT64 = 'float64',
  INT8 = 'int8',
  UINT8 = 'uint8',
  INT16 = 'int16',
  UINT16 = 'uint16',
  INT32 = 'int32',
  UINT32 = 'uint32',
}

export interface IJtdDict<M> {
  [name: string]: IJtd<M>;
}

/**
 * The JTD with embedded definitions.
 *
 * @template M The type of the JTD metadata.
 *
 * @see https://tools.ietf.org/html/rfc8927 RFC8927
 * @see https://jsontypedef.com/docs/jtd-in-5-minutes JTD in 5 minutes
 */
export interface IJtdRoot<M> extends IJtd<M> {
  definitions?: IJtdDict<M>;
}

/**
 * The definition of a type.
 *
 * @template M The type of the JTD metadata.
 */
export interface IJtd<M> {
  metadata?: M;
  nullable?: boolean;
  ref?: string;
  type?: JtdType | string;
  enum?: Array<string>;
  elements?: IJtd<M>;
  values?: IJtd<M>;
  properties?: IJtdDict<M>;
  optionalProperties?: IJtdDict<M>;
  discriminator?: string;
  mapping?: IJtdDict<M>;
}
