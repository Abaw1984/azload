// Simplified STAAD.Pro Lexer - Fixed Implementation
// This is a working lexer for STAAD.Pro file format parsing without ANTLR4 dependencies

// Token type constants
export const STAADTokenTypes = {
  UNIT: 1,
  JOINT: 2,
  COORDINATES: 3,
  MEMBER: 4,
  INCIDENCES: 5,
  PROPERTY: 6,
  CONSTANTS: 7,
  SUPPORTS: 8,
  LOAD: 9,
  ELEMENT: 10,
  TO: 11,
  PRISMATIC: 12,
  SECTION: 13,
  MATERIAL: 14,
  FIXED: 15,
  PINNED: 16,
  FX: 17,
  FY: 18,
  FZ: 19,
  MX: 20,
  MY: 21,
  MZ: 22,
  UNI: 23,
  GX: 24,
  GY: 25,
  GZ: 26,
  PERFORM: 27,
  ANALYSIS: 28,
  FINISH: 29,
  END: 30,
  NUMBER: 31,
  FLOAT: 32,
  IDENTIFIER: 33,
  COMMENT: 34,
  WHITESPACE: 35,
  NEWLINE: 36,
  EOF: 37,
  COMMA: 38,
  EQUALS: 39,
  LPAREN: 40,
  RPAREN: 41,
} as const;

export type STAADTokenType =
  (typeof STAADTokenTypes)[keyof typeof STAADTokenTypes];

// Token interface
export interface STAADToken {
  type: STAADTokenType;
  text: string;
  line: number;
  column: number;
  startIndex: number;
  stopIndex: number;
}

// Simplified STAAD Lexer without ANTLR4 dependencies
export class STAADLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 0;
  private tokens: STAADToken[] = [];

  // STAAD.Pro keyword mapping
  private static readonly KEYWORDS = new Map<string, STAADTokenType>([
    ["UNIT", STAADTokenTypes.UNIT],
    ["JOINT", STAADTokenTypes.JOINT],
    ["COORDINATES", STAADTokenTypes.COORDINATES],
    ["MEMBER", STAADTokenTypes.MEMBER],
    ["INCIDENCES", STAADTokenTypes.INCIDENCES],
    ["PROPERTY", STAADTokenTypes.PROPERTY],
    ["PROPERTIES", STAADTokenTypes.PROPERTY],
    ["CONSTANTS", STAADTokenTypes.CONSTANTS],
    ["CONSTANT", STAADTokenTypes.CONSTANTS],
    ["SUPPORTS", STAADTokenTypes.SUPPORTS],
    ["SUPPORT", STAADTokenTypes.SUPPORTS],
    ["LOAD", STAADTokenTypes.LOAD],
    ["ELEMENT", STAADTokenTypes.ELEMENT],
    ["TO", STAADTokenTypes.TO],
    ["PRISMATIC", STAADTokenTypes.PRISMATIC],
    ["SECTION", STAADTokenTypes.SECTION],
    ["MATERIAL", STAADTokenTypes.MATERIAL],
    ["FIXED", STAADTokenTypes.FIXED],
    ["PINNED", STAADTokenTypes.PINNED],
    ["FX", STAADTokenTypes.FX],
    ["FY", STAADTokenTypes.FY],
    ["FZ", STAADTokenTypes.FZ],
    ["MX", STAADTokenTypes.MX],
    ["MY", STAADTokenTypes.MY],
    ["MZ", STAADTokenTypes.MZ],
    ["UNI", STAADTokenTypes.UNI],
    ["GX", STAADTokenTypes.GX],
    ["GY", STAADTokenTypes.GY],
    ["GZ", STAADTokenTypes.GZ],
    ["PERFORM", STAADTokenTypes.PERFORM],
    ["ANALYSIS", STAADTokenTypes.ANALYSIS],
    ["FINISH", STAADTokenTypes.FINISH],
    ["END", STAADTokenTypes.END],
  ]);

  constructor(input: string) {
    this.input = input;
    console.log(`🔤 STAADLexer initialized with ${input.length} characters`);
  }

  // Tokenize the entire input
  public tokenize(): STAADToken[] {
    console.log("🔍 Starting STAAD tokenization...");

    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 0;

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    // Add EOF token
    this.tokens.push({
      type: STAADTokenTypes.EOF,
      text: "",
      line: this.line,
      column: this.column,
      startIndex: this.position,
      stopIndex: this.position,
    });

    console.log(`✅ Tokenization complete: ${this.tokens.length} tokens`);
    return this.tokens;
  }

  // Get next token
  private nextToken(): STAADToken | null {
    if (this.position >= this.input.length) {
      return null;
    }

    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    const char = this.input[this.position];

    // Handle comments
    if (char === "*" || char === "!") {
      return this.readComment(startPos, startLine, startColumn);
    }

    // Handle newlines
    if (char === "\n" || char === "\r") {
      return this.readNewline(startPos, startLine, startColumn);
    }

    // Handle numbers (integers and floats) including negative numbers
    if (
      this.isDigit(char) ||
      (char === "." && this.isDigit(this.peek())) ||
      ((char === "-" || char === "+") && this.isDigit(this.peek()))
    ) {
      return this.readNumber(startPos, startLine, startColumn);
    }

    // Handle special characters
    switch (char) {
      case ",":
        return this.createToken(
          STAADTokenTypes.COMMA,
          char,
          startPos,
          startLine,
          startColumn,
        );
      case "=":
        return this.createToken(
          STAADTokenTypes.EQUALS,
          char,
          startPos,
          startLine,
          startColumn,
        );
      case "(":
        return this.createToken(
          STAADTokenTypes.LPAREN,
          char,
          startPos,
          startLine,
          startColumn,
        );
      case ")":
        return this.createToken(
          STAADTokenTypes.RPAREN,
          char,
          startPos,
          startLine,
          startColumn,
        );
    }

    // Handle identifiers and keywords
    if (this.isLetter(char) || char === "_") {
      return this.readIdentifier(startPos, startLine, startColumn);
    }

    // Report and skip unknown characters
    this.reportUnexpectedChar(char);
    this.advance();
    return null;
  }

  // Read comment token
  private readComment(
    startPos: number,
    startLine: number,
    startColumn: number,
  ): STAADToken {
    let text = "";

    while (
      this.position < this.input.length &&
      !this.isNewline(this.input[this.position])
    ) {
      text += this.input[this.position];
      this.advance();
    }

    return {
      type: STAADTokenTypes.COMMENT,
      text,
      line: startLine,
      column: startColumn,
      startIndex: startPos,
      stopIndex: this.position - 1,
    };
  }

  // Read newline token
  private readNewline(
    startPos: number,
    startLine: number,
    startColumn: number,
  ): STAADToken {
    let text = "";

    if (this.input[this.position] === "\r") {
      text += this.input[this.position];
      this.advance();
    }
    if (
      this.position < this.input.length &&
      this.input[this.position] === "\n"
    ) {
      text += this.input[this.position];
      this.advance();
    }

    this.line++;
    this.column = 0;

    return {
      type: STAADTokenTypes.NEWLINE,
      text,
      line: startLine,
      column: startColumn,
      startIndex: startPos,
      stopIndex: this.position - 1,
    };
  }

  // Read number token (integer or float) with sign handling
  private readNumber(
    startPos: number,
    startLine: number,
    startColumn: number,
  ): STAADToken {
    let text = "";
    let hasDecimal = false;
    let hasExponent = false;

    const char = this.input[this.position];

    // Handle initial sign
    if (char === "-" || char === "+") {
      text += char;
      this.advance();
    }

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (this.isDigit(char)) {
        text += char;
        this.advance();
      } else if (char === "." && !hasDecimal && !hasExponent) {
        hasDecimal = true;
        text += char;
        this.advance();
      } else if (
        (char === "e" || char === "E") &&
        !hasExponent &&
        text.length > 0
      ) {
        hasExponent = true;
        text += char;
        this.advance();

        // Handle optional +/- after exponent
        if (
          this.position < this.input.length &&
          (this.input[this.position] === "+" ||
            this.input[this.position] === "-")
        ) {
          text += this.input[this.position];
          this.advance();
        }
      } else {
        break;
      }
    }

    const tokenType =
      hasDecimal || hasExponent
        ? STAADTokenTypes.FLOAT
        : STAADTokenTypes.NUMBER;

    return {
      type: tokenType,
      text,
      line: startLine,
      column: startColumn,
      startIndex: startPos,
      stopIndex: this.position - 1,
    };
  }

  // Read identifier or keyword token
  private readIdentifier(
    startPos: number,
    startLine: number,
    startColumn: number,
  ): STAADToken {
    let text = "";

    while (
      this.position < this.input.length &&
      (this.isAlphaNumeric(this.input[this.position]) ||
        this.input[this.position] === "_")
    ) {
      text += this.input[this.position];
      this.advance();
    }

    // Check if it's a keyword
    const upperText = text.toUpperCase();
    const tokenType =
      STAADLexer.KEYWORDS.get(upperText) || STAADTokenTypes.IDENTIFIER;

    return {
      type: tokenType,
      text,
      line: startLine,
      column: startColumn,
      startIndex: startPos,
      stopIndex: this.position - 1,
    };
  }

  // Skip whitespace characters
  private skipWhitespace(): void {
    while (
      this.position < this.input.length &&
      this.isWhitespace(this.input[this.position])
    ) {
      this.advance();
    }
  }

  // Character classification methods
  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isLetter(char: string): boolean {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isLetter(char) || this.isDigit(char);
  }

  private isWhitespace(char: string): boolean {
    return char === " " || char === "\t" || char === "\r";
  }

  private isNewline(char: string): boolean {
    return char === "\n" || char === "\r";
  }

  // Navigation methods
  private advance(): void {
    if (this.position < this.input.length) {
      if (this.input[this.position] === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  private peek(offset: number = 1): string {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : "";
  }

  // Get all tokens
  public getTokens(): STAADToken[] {
    if (this.tokens.length === 0) {
      this.tokenize();
    }
    return this.tokens;
  }

  // Create single character token
  private createToken(
    type: STAADTokenType,
    text: string,
    startPos: number,
    startLine: number,
    startColumn: number,
  ): STAADToken {
    this.advance();
    return {
      type,
      text,
      line: startLine,
      column: startColumn,
      startIndex: startPos,
      stopIndex: startPos,
    };
  }

  // Report unexpected character for debugging
  private reportUnexpectedChar(char: string): void {
    console.warn(
      `⚠️ Unexpected character '${char}' at line ${this.line}, column ${this.column}`,
    );
  }

  // Get token type name
  public static getTokenTypeName(type: STAADTokenType): string {
    for (const [name, value] of Object.entries(STAADTokenTypes)) {
      if (value === type) {
        return name;
      }
    }
    return "UNKNOWN";
  }
}

// STAAD Model Visitor for extracting structured data
export class STAADModelVisitor {
  private model: any;
  private warnings: string[];
  private currentSection: string = "";
  private sectionState: {
    inJointCoordinates: boolean;
    inMemberIncidences: boolean;
    inLoadDefinition: boolean;
    inPropertyDefinition: boolean;
    inSupportDefinition: boolean;
  } = {
    inJointCoordinates: false,
    inMemberIncidences: false,
    inLoadDefinition: false,
    inPropertyDefinition: false,
    inSupportDefinition: false,
  };

  constructor(model: any, warnings: string[]) {
    this.model = model;
    this.warnings = warnings;
  }

  public visit(tokens: STAADToken[]): void {
    console.log("🔍 STAADModelVisitor: Extracting model data from tokens");
    console.log(`📊 Processing ${tokens.length} tokens`);

    // Process tokens to extract structural data
    this.processTokens(tokens);
  }

  private processTokens(tokens: STAADToken[]): void {
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      // Update section state based on keywords
      this.updateSectionState(token, tokens, i);

      switch (token.type) {
        case STAADTokenTypes.JOINT:
          i = this.processJointSection(tokens, i);
          break;
        case STAADTokenTypes.MEMBER:
          i = this.processMemberSection(tokens, i);
          break;
        case STAADTokenTypes.LOAD:
          i = this.processLoadSection(tokens, i);
          break;
        case STAADTokenTypes.NUMBER:
        case STAADTokenTypes.FLOAT:
          if (this.sectionState.inJointCoordinates) {
            i = this.processJointCoordinateData(tokens, i);
          } else if (this.sectionState.inMemberIncidences) {
            i = this.processMemberIncidenceData(tokens, i);
          } else {
            i++;
          }
          break;
        default:
          i++;
          break;
      }
    }
  }

  private updateSectionState(
    token: STAADToken,
    tokens: STAADToken[],
    index: number,
  ): void {
    // Reset all states
    Object.keys(this.sectionState).forEach((key) => {
      (this.sectionState as any)[key] = false;
    });

    // Check for section keywords
    if (token.type === STAADTokenTypes.JOINT) {
      const nextToken = tokens[index + 1];
      if (nextToken && nextToken.type === STAADTokenTypes.COORDINATES) {
        this.sectionState.inJointCoordinates = true;
        this.currentSection = "JOINT_COORDINATES";
      }
    } else if (token.type === STAADTokenTypes.MEMBER) {
      const nextToken = tokens[index + 1];
      if (nextToken && nextToken.type === STAADTokenTypes.INCIDENCES) {
        this.sectionState.inMemberIncidences = true;
        this.currentSection = "MEMBER_INCIDENCES";
      }
    }
  }

  private processJointSection(
    tokens: STAADToken[],
    startIndex: number,
  ): number {
    console.log("📍 Processing JOINT section");
    // Look ahead to determine if this is coordinates section
    const nextToken = tokens[startIndex + 1];
    if (nextToken && nextToken.type === STAADTokenTypes.COORDINATES) {
      this.sectionState.inJointCoordinates = true;
      return startIndex + 2; // Skip JOINT COORDINATES tokens
    }
    return startIndex + 1;
  }

  private processMemberSection(
    tokens: STAADToken[],
    startIndex: number,
  ): number {
    console.log("🔗 Processing MEMBER section");
    // Look ahead to determine if this is incidences section
    const nextToken = tokens[startIndex + 1];
    if (nextToken && nextToken.type === STAADTokenTypes.INCIDENCES) {
      this.sectionState.inMemberIncidences = true;
      return startIndex + 2; // Skip MEMBER INCIDENCES tokens
    }
    return startIndex + 1;
  }

  private processLoadSection(tokens: STAADToken[], startIndex: number): number {
    console.log("⚖️ Processing LOAD section");
    this.sectionState.inLoadDefinition = true;
    return startIndex + 1;
  }

  private processJointCoordinateData(
    tokens: STAADToken[],
    startIndex: number,
  ): number {
    console.log("📍 Processing joint coordinate data");
    // Extract joint ID and coordinates
    const jointData: number[] = [];
    let i = startIndex;

    // Collect numeric tokens for this joint
    while (
      i < tokens.length &&
      (tokens[i].type === STAADTokenTypes.NUMBER ||
        tokens[i].type === STAADTokenTypes.FLOAT ||
        tokens[i].type === STAADTokenTypes.TO ||
        tokens[i].type === STAADTokenTypes.COMMA)
    ) {
      if (
        tokens[i].type === STAADTokenTypes.NUMBER ||
        tokens[i].type === STAADTokenTypes.FLOAT
      ) {
        jointData.push(parseFloat(tokens[i].text));
      }
      i++;
    }

    if (jointData.length >= 4) {
      console.log(
        `Joint data: ID=${jointData[0]}, X=${jointData[1]}, Y=${jointData[2]}, Z=${jointData[3]}`,
      );
    }

    return i;
  }

  private processMemberIncidenceData(
    tokens: STAADToken[],
    startIndex: number,
  ): number {
    console.log("🔗 Processing member incidence data");
    const memberData: number[] = [];
    let i = startIndex;

    // Collect numeric tokens for this member
    while (
      i < tokens.length &&
      (tokens[i].type === STAADTokenTypes.NUMBER ||
        tokens[i].type === STAADTokenTypes.FLOAT ||
        tokens[i].type === STAADTokenTypes.TO ||
        tokens[i].type === STAADTokenTypes.COMMA)
    ) {
      if (
        tokens[i].type === STAADTokenTypes.NUMBER ||
        tokens[i].type === STAADTokenTypes.FLOAT
      ) {
        memberData.push(parseFloat(tokens[i].text));
      }
      i++;
    }

    if (memberData.length >= 3) {
      console.log(
        `Member data: ID=${memberData[0]}, Start=${memberData[1]}, End=${memberData[2]}`,
      );
    }

    return i;
  }
}

// Export for compatibility
export { STAADLexer as default };
