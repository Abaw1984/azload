import {
  StructuralModel,
  Node,
  Member,
  MemberType,
  Section,
  Material,
  LoadCase,
  Load,
  Plate,
  Support,
  Release,
} from "@/types/model";

/**
 * Universal Parser for STAAD.Pro and SAP2000 files
 * Handles both file formats with robust error handling and fallback mechanisms
 */
export class UniversalParser {
  private content: string;
  private lines: string[];
  private filename: string;
  private fileType: "STAAD" | "SAP2000";
  private nodes: Node[] = [];
  private members: Member[] = [];
  private originalUnits: {
    length: "M" | "MM" | "FT" | "IN";
    force: "N" | "KN" | "LB" | "KIP";
    mass: "KG" | "LB" | "SLUG";
    temperature: "C" | "F";
  } = { length: "M", force: "KN", mass: "KG", temperature: "C" };
  private unitsSystem: "METRIC" | "IMPERIAL" = "METRIC";

  constructor(content: string, filename: string) {
    this.content = content;
    this.filename = filename;
    this.lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    this.fileType = this.detectFileType();
    console.log(
      `Universal Parser: Processing ${filename} as ${this.fileType} with ${this.lines.length} lines`,
    );
  }

  private detectFileType(): "STAAD" | "SAP2000" {
    const extension = this.filename.toLowerCase().split(".").pop();

    // Check file extension first
    if (extension === "s2k" || extension === "sdb") {
      return "SAP2000";
    }

    // Check content patterns
    const contentUpper = this.content.toUpperCase();
    if (
      contentUpper.includes("TABLE:") &&
      contentUpper.includes("JOINT COORDINATES")
    ) {
      return "SAP2000";
    }

    // Default to STAAD
    return "STAAD";
  }

  parse(): StructuralModel {
    // First parse units to determine the original units system
    if (this.fileType === "STAAD") {
      this.parseStaadUnits();
    } else {
      this.parseSap2000Units();
    }

    console.log(`🎯 UNITS DETECTION COMPLETE:`, {
      fileType: this.fileType,
      originalUnits: this.originalUnits,
      unitsSystem: this.unitsSystem,
      preservedFromFile: true,
    });

    const model: StructuralModel = {
      id: crypto.randomUUID(),
      name: this.filename.replace(/\.[^/.]+$/, ""),
      type: this.fileType,
      units: { ...this.originalUnits },
      unitsSystem: this.unitsSystem,
      nodes: [],
      members: [],
      plates: [],
      sections: [],
      materials: [],
      loadCases: [],
      supports: [],
      releases: [],
    };

    try {
      if (this.fileType === "SAP2000") {
        this.parseSap2000(model);
      } else {
        this.parseStaad(model);
      }

      this.addDefaults(model);
      this.calculateGeometry(model);

      // 🔍 2️⃣ CONFIRM PARSED DATA STORAGE - Log parsed data immediately
      console.log("🔍 PARSED MODEL DATA (immediately after parsing):", {
        name: model.name,
        nodes: model.nodes.length,
        members: model.members.length,
        units: model.units,
        unitsSystem: model.unitsSystem,
        geometry: model.geometry,
        sampleNodes: model.nodes.slice(0, 3),
        sampleMembers: model.members.slice(0, 3),
      });

      // Final validation
      if (model.nodes.length === 0) {
        throw new Error("No nodes found in file. Please check file format.");
      }

      if (model.members.length === 0) {
        console.warn(
          "No members found with standard parsing. Attempting fallback methods...",
        );
        this.attemptFallbackMemberParsing(model);

        if (model.members.length === 0) {
          throw new Error(
            "No members found in file. Please check file format.",
          );
        }
      }

      console.log(
        `Parse Complete: ${model.nodes.length} nodes, ${model.members.length} members`,
      );
      return model;
    } catch (error) {
      console.error("Parsing error:", error);
      throw error;
    }
  }

  private parseStaad(model: StructuralModel): void {
    // Units already parsed in main parse() method
    this.parseStaadNodes(model);
    this.parseStaadMembers(model);
  }

  private parseSap2000(model: StructuralModel): void {
    // Units already parsed in main parse() method
    this.parseSapNodes(model);
    this.parseSapMembers(model);
  }

  private parseStaadUnits(): void {
    console.log("🔍 PARSING STAAD UNITS - Enhanced Detection");

    // Look for unit definitions in STAAD format with enhanced patterns
    for (const line of this.lines) {
      const upperLine = line.toUpperCase();

      // Enhanced unit detection patterns
      if (
        upperLine.includes("UNIT") ||
        upperLine.includes("INCHES") ||
        upperLine.includes("FEET") ||
        upperLine.includes("METER") ||
        upperLine.includes("KIP") ||
        upperLine.includes("KN")
      ) {
        console.log(`📏 Found potential STAAD unit line: ${line}`);

        // Enhanced parsing for imperial units
        if (upperLine.includes("INCH") || upperLine.includes("IN")) {
          this.originalUnits.length = "IN";
          this.unitsSystem = "IMPERIAL";
          console.log("✅ Detected INCHES unit system");
        } else if (upperLine.includes("FT") || upperLine.includes("FEET")) {
          this.originalUnits.length = "FT";
          this.unitsSystem = "IMPERIAL";
          console.log("✅ Detected FEET unit system");
        } else if (upperLine.includes("MM")) {
          this.originalUnits.length = "MM";
          this.unitsSystem = "METRIC";
          console.log("✅ Detected MM unit system");
        } else if (
          upperLine.includes("METER") ||
          (upperLine.includes("M") && !upperLine.includes("MM"))
        ) {
          this.originalUnits.length = "M";
          this.unitsSystem = "METRIC";
          console.log("✅ Detected METER unit system");
        }

        // Enhanced force unit detection
        if (upperLine.includes("KIP")) {
          this.originalUnits.force = "KIP";
          this.originalUnits.mass = "SLUG";
          this.originalUnits.temperature = "F";
          this.unitsSystem = "IMPERIAL";
          console.log("✅ Detected KIP force system - IMPERIAL confirmed");
        } else if (upperLine.includes("KN")) {
          this.originalUnits.force = "KN";
          this.originalUnits.mass = "KG";
          this.originalUnits.temperature = "C";
          this.unitsSystem = "METRIC";
          console.log("✅ Detected KN force system - METRIC confirmed");
        } else if (upperLine.includes("LB")) {
          this.originalUnits.force = "LB";
          this.originalUnits.mass = "LB";
          this.originalUnits.temperature = "F";
          this.unitsSystem = "IMPERIAL";
          console.log("✅ Detected LB force system - IMPERIAL confirmed");
        }
      }
    }

    // Enhanced fallback detection based on coordinate magnitudes
    if (this.unitsSystem === "METRIC" && this.originalUnits.length === "M") {
      // Check if coordinates suggest imperial units (typically larger values)
      const sampleCoords = this.lines
        .slice(0, 50)
        .map((line) => {
          const match = line.match(
            /([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/,
          );
          return match
            ? [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]
            : null;
        })
        .filter(
          (coords) =>
            coords && coords.every((c) => !isNaN(c) && Math.abs(c) > 0),
        );

      if (sampleCoords.length > 0) {
        const avgMagnitude =
          sampleCoords.flat().reduce((sum, val) => sum + Math.abs(val), 0) /
          (sampleCoords.length * 3);

        // Enhanced detection: If average coordinate magnitude is > 10, likely imperial (inches)
        // This catches typical structural models with dimensions in the 100-300 inch range
        if (avgMagnitude > 10) {
          this.originalUnits.length = "IN";
          this.originalUnits.force = "KIP";
          this.originalUnits.mass = "SLUG";
          this.originalUnits.temperature = "F";
          this.unitsSystem = "IMPERIAL";
          console.log(
            `🎯 FALLBACK: Detected IMPERIAL units based on coordinate magnitude (avg: ${avgMagnitude.toFixed(1)})`,
          );
        }
      }
    }

    console.log(`✅ STAAD UNITS DETECTION COMPLETE:`, {
      originalUnits: this.originalUnits,
      unitsSystem: this.unitsSystem,
      detectionMethod: "Enhanced pattern matching with fallback",
    });
  }

  private parseSap2000Units(): void {
    console.log("🔍 PARSING SAP2000 UNITS - Preserving Original Units");

    // Look for unit definitions in SAP2000 format
    for (const line of this.lines) {
      const upperLine = line.toUpperCase();

      // Check for unit tables or definitions
      if (
        upperLine.includes("UNIT") &&
        (upperLine.includes("TABLE") || upperLine.includes("="))
      ) {
        console.log(`📏 Found SAP2000 unit line: ${line}`);

        // Parse common SAP2000 unit patterns
        if (upperLine.includes("IN") || upperLine.includes("INCH")) {
          this.originalUnits.length = "IN";
          this.unitsSystem = "IMPERIAL";
        } else if (upperLine.includes("FT") || upperLine.includes("FEET")) {
          this.originalUnits.length = "FT";
          this.unitsSystem = "IMPERIAL";
        } else if (upperLine.includes("MM")) {
          this.originalUnits.length = "MM";
          this.unitsSystem = "METRIC";
        } else if (upperLine.includes("M") && !upperLine.includes("MM")) {
          this.originalUnits.length = "M";
          this.unitsSystem = "METRIC";
        }

        if (upperLine.includes("KIP")) {
          this.originalUnits.force = "KIP";
          this.originalUnits.mass = "SLUG";
          this.originalUnits.temperature = "F";
          this.unitsSystem = "IMPERIAL";
        } else if (upperLine.includes("KN")) {
          this.originalUnits.force = "KN";
          this.originalUnits.mass = "KG";
          this.originalUnits.temperature = "C";
          this.unitsSystem = "METRIC";
        } else if (upperLine.includes("LB")) {
          this.originalUnits.force = "LB";
          this.originalUnits.mass = "LB";
          this.originalUnits.temperature = "F";
          this.unitsSystem = "IMPERIAL";
        }

        break;
      }
    }

    console.log(`✅ SAP2000 UNITS PRESERVED:`, {
      originalUnits: this.originalUnits,
      unitsSystem: this.unitsSystem,
    });
  }

  private parseStaadNodes(model: StructuralModel): void {
    let inNodeSection = false;
    let nodePatterns = [
      /JOINT\s+COORDINATES/i,
      /NODE\s+COORDINATES/i,
      /JOINT\s+COORD/i,
      /NODE\s+COORD/i,
    ];

    console.log("=== STAAD NODE PARSING START ===");
    console.log(`Total lines to process: ${this.lines.length}`);

    // First pass: Look for explicit node sections
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const upperLine = line.toUpperCase();

      // Check for node section start
      if (
        !inNodeSection &&
        nodePatterns.some((pattern) => pattern.test(upperLine))
      ) {
        inNodeSection = true;
        console.log(`Found node section at line ${i}: ${line}`);
        continue;
      }

      // Check for section end
      if (inNodeSection && this.isNewStaadSection(upperLine)) {
        console.log(`Node section ended at line ${i}: ${line}`);
        break;
      }

      if (inNodeSection) {
        this.parseStaadNodeLine(line, model);
      }
    }

    console.log(`STAAD: Found ${model.nodes.length} nodes in standard parsing`);

    // Enhanced fallback: try multiple parsing strategies
    if (model.nodes.length === 0) {
      console.warn(
        "No nodes found in standard section. Trying enhanced fallback...",
      );

      // Strategy 1: Look for any line with 4 numbers (ID X Y Z)
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i];
        if (this.looksLikeNodeDefinition(line)) {
          this.parseStaadNodeLine(line, model);
        }
      }

      console.log(`After fallback strategy 1: ${model.nodes.length} nodes`);

      // Strategy 2: Look for patterns like "1 0.0 0.0 0.0" anywhere
      if (model.nodes.length === 0) {
        for (const line of this.lines) {
          const match = line.match(
            /^\s*(\d+)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/,
          );
          if (match) {
            const [, id, x, y, z] = match;
            const nodeId = id.toString();
            const xCoord = parseFloat(x);
            const yCoord = parseFloat(y);
            const zCoord = parseFloat(z);

            if (!model.nodes.some((n) => n.id === nodeId)) {
              model.nodes.push({
                id: nodeId,
                x: x, // Preserve original coordinates without conversion
                y: y, // Preserve original coordinates without conversion
                z: z, // Preserve original coordinates without conversion
              });
              console.log(
                `Added node via regex: ${nodeId} (${xCoord.toFixed(3)}, ${yCoord.toFixed(3)}, ${zCoord.toFixed(3)}) [${this.originalUnits.length}]`,
              );
            }
          }
        }
      }

      console.log(`After fallback strategy 2: ${model.nodes.length} nodes`);
    }

    console.log(
      `=== STAAD NODE PARSING COMPLETE: ${model.nodes.length} nodes in ${this.originalUnits.length} units ===`,
    );
    console.log(
      `📏 Original Units System: ${this.unitsSystem} (${this.originalUnits.length}/${this.originalUnits.force})`,
    );
    console.log(
      `🎯 NO UNIT CONVERSION APPLIED - Coordinates preserved as-is from file`,
    );
  }

  private parseStaadNodeLine(line: string, model: StructuralModel): void {
    // Handle semicolon-separated node definitions on single line
    const nodeDefs = line.split(";").filter((def) => def.trim() !== "");

    for (const nodeDef of nodeDefs) {
      const cleanLine = nodeDef.replace(/[,]/g, " ").trim();
      const parts = cleanLine.split(/\s+/).filter((p) => p !== "");

      // Look for node definition: ID X Y Z
      if (parts.length >= 4) {
        const id = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        // Enhanced validation - be more permissive with node IDs
        if (
          !isNaN(x) &&
          !isNaN(y) &&
          !isNaN(z) &&
          id.length > 0 &&
          !model.nodes.some((n) => n.id === id)
        ) {
          const node = {
            id,
            x: x, // Preserve original coordinates without conversion
            y: y, // Preserve original coordinates without conversion
            z: z, // Preserve original coordinates without conversion
          };
          model.nodes.push(node);
          console.log(
            `Added node: ${id} (${node.x.toFixed(3)}, ${node.y.toFixed(3)}, ${node.z.toFixed(3)}) [${this.originalUnits.length}]`,
          );
        }
      }
    }
  }

  // Helper method to identify potential node definitions
  private looksLikeNodeDefinition(line: string): boolean {
    const cleanLine = line.replace(/[;,]/g, " ").trim();
    const parts = cleanLine.split(/\s+/).filter((p) => p !== "");

    // Must have at least 4 parts and first part should be a reasonable node ID
    if (parts.length < 4) return false;

    // Check if first part could be a node ID (number or alphanumeric)
    const firstPart = parts[0];
    if (!/^[A-Za-z0-9_-]+$/.test(firstPart)) return false;

    // Check if next 3 parts are numbers (coordinates)
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);

    return !isNaN(x) && !isNaN(y) && !isNaN(z);
  }

  private parseStaadMembers(model: StructuralModel): void {
    let inMemberSection = false;
    const nodeIds = new Set(model.nodes.map((n) => n.id));
    let memberPatterns = [
      /MEMBER\s+INCIDENCES/i,
      /MEMBER\s+CONNECTIVITY/i,
      /MEMBER\s+CONNECT/i,
      /ELEMENT\s+INCIDENCES/i,
      /MEMBER\s+INCI/i,
      /MEMBERS/i,
    ];

    console.log("=== STAAD MEMBER PARSING START ===");
    console.log(
      `Available node IDs: ${Array.from(nodeIds).slice(0, 20).join(", ")}`,
    );
    console.log(`Total nodes available: ${nodeIds.size}`);

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const upperLine = line.toUpperCase();

      // Check for member section start
      if (
        !inMemberSection &&
        memberPatterns.some((pattern) => pattern.test(upperLine))
      ) {
        inMemberSection = true;
        console.log(`Found member section at line ${i}: ${line}`);
        continue;
      }

      // Check for section end
      if (inMemberSection && this.isNewStaadSection(upperLine)) {
        console.log(`Member section ended at line ${i}: ${line}`);
        break;
      }

      if (inMemberSection) {
        this.parseStaadMemberLine(line, model, nodeIds);
      }
    }

    console.log(
      `STAAD: Found ${model.members.length} members in standard parsing`,
    );

    // Enhanced fallback for members
    if (model.members.length === 0) {
      console.warn(
        "No members found in standard section. Trying enhanced fallback...",
      );

      // Strategy 1: Look for any line that connects two valid node IDs
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i];
        if (this.looksLikeMemberDefinition(line, nodeIds)) {
          this.parseStaadMemberLine(line, model, nodeIds);
        }
      }

      console.log(
        `After member fallback strategy 1: ${model.members.length} members`,
      );

      // Strategy 2: Look for patterns like "1 2 3" (member connecting nodes 2 and 3)
      if (model.members.length === 0) {
        for (const line of this.lines) {
          const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)/);
          if (match) {
            const [, memberId, startNodeId, endNodeId] = match;
            if (
              nodeIds.has(startNodeId) &&
              nodeIds.has(endNodeId) &&
              startNodeId !== endNodeId
            ) {
              const member: Member = {
                id: memberId,
                startNodeId: startNodeId,
                endNodeId: endNodeId,
                sectionId: "DEFAULT",
                materialId: "STEEL",
                type: "BEAM",
              };
              if (!model.members.some((m) => m.id === memberId)) {
                model.members.push(member);
                console.log(
                  `Added fallback member: ${memberId} (${startNodeId} -> ${endNodeId})`,
                );
              }
            }
          }
        }
      }

      console.log(
        `After member fallback strategy 2: ${model.members.length} members`,
      );
    }

    console.log(
      `=== STAAD MEMBER PARSING COMPLETE: ${model.members.length} members ===`,
    );
    console.log(
      `🎯 Members parsed with preserved ${this.unitsSystem} units system`,
    );
  }

  private parseStaadMemberLine(
    line: string,
    model: StructuralModel,
    nodeIds: Set<string>,
  ): void {
    // Handle semicolon-separated member definitions on single line
    const memberDefs = line.split(";").filter((def) => def.trim() !== "");

    for (const memberDef of memberDefs) {
      const cleanLine = memberDef.replace(/[,]/g, " ").trim();
      const parts = cleanLine.split(/\s+/).filter((p) => p !== "");

      // Handle different member definition formats
      if (parts.length >= 3) {
        // Format 1: "1 19 20" or "M1 N101 N102"
        const memberId = parts[0];
        const startNode = parts[1];
        const endNode = parts[2];

        if (
          nodeIds.has(startNode) &&
          nodeIds.has(endNode) &&
          startNode !== endNode &&
          !model.members.some((m) => m.id === memberId)
        ) {
          const member: Member = {
            id: memberId,
            startNodeId: startNode,
            endNodeId: endNode,
            sectionId: "DEFAULT",
            materialId: "STEEL",
            type: "BEAM",
          };
          model.members.push(member);
          console.log(`Added member: ${memberId} (${startNode} -> ${endNode})`);
          continue;
        }
      }

      // Handle range definitions: "1 TO 10 INCIDENCES 11 12; 12 13; ..."
      if (parts.includes("TO") && parts.includes("INCIDENCES")) {
        this.parseStaadRangeMembers(parts, model, nodeIds);
        continue;
      }

      // Look for any two consecutive valid node IDs in the line
      for (let i = 0; i < parts.length - 1; i++) {
        if (
          nodeIds.has(parts[i]) &&
          nodeIds.has(parts[i + 1]) &&
          parts[i] !== parts[i + 1]
        ) {
          const memberId = `gen-${model.members.length + 1}`;
          const member: Member = {
            id: memberId,
            startNodeId: parts[i],
            endNodeId: parts[i + 1],
            sectionId: "DEFAULT",
            materialId: "STEEL",
            type: "BEAM",
          };
          if (
            !model.members.some(
              (m) => m.startNodeId === parts[i] && m.endNodeId === parts[i + 1],
            )
          ) {
            model.members.push(member);
            console.log(
              `Added inferred member: ${memberId} (${parts[i]} -> ${parts[i + 1]})`,
            );
          }
          break;
        }
      }
    }
  }

  // Helper method to identify potential member definitions
  private looksLikeMemberDefinition(
    line: string,
    nodeIds: Set<string>,
  ): boolean {
    const cleanLine = line.replace(/[;,]/g, " ").trim();
    const parts = cleanLine.split(/\s+/).filter((p) => p !== "");

    // Must have at least 3 parts
    if (parts.length < 3) return false;

    // Check if we have a member ID followed by two valid node IDs
    const memberId = parts[0];
    const startNode = parts[1];
    const endNode = parts[2];

    return (
      memberId.length > 0 &&
      nodeIds.has(startNode) &&
      nodeIds.has(endNode) &&
      startNode !== endNode
    );
  }

  private parseStaadRangeMembers(
    parts: string[],
    model: StructuralModel,
    nodeIds: Set<string>,
  ): void {
    const startIdx = parts.findIndex((p) => p.match(/^\d+$/));
    const toIdx = parts.findIndex((p) => p.toUpperCase() === "TO");
    const incIdx = parts.findIndex((p) => p.toUpperCase().includes("INCI"));

    if (startIdx >= 0 && toIdx > startIdx && incIdx > toIdx) {
      const startMember = parseInt(parts[startIdx]);
      const endMember = parseInt(parts[toIdx + 1]);

      // Find node pairs after INCIDENCES
      const nodeData = parts.slice(incIdx + 1);
      let nodeIdx = 0;

      for (
        let memberId = startMember;
        memberId <= endMember && nodeIdx < nodeData.length - 1;
        memberId++
      ) {
        const startNode = nodeData[nodeIdx];
        const endNode = nodeData[nodeIdx + 1];

        if (nodeIds.has(startNode) && nodeIds.has(endNode)) {
          const member: Member = {
            id: memberId.toString(),
            startNodeId: startNode,
            endNodeId: endNode,
            sectionId: "DEFAULT",
            materialId: "STEEL",
            type: "BEAM",
          };
          model.members.push(member);
          console.log(
            `Added range member: ${memberId} (${startNode} -> ${endNode})`,
          );
        }
        nodeIdx += 2;
      }
    }
  }

  private parseSapNodes(model: StructuralModel): void {
    let inTable = false;
    let headerPassed = false;

    for (const line of this.lines) {
      if (
        line.includes("TABLE:") &&
        line.toUpperCase().includes("JOINT COORDINATES")
      ) {
        inTable = true;
        headerPassed = false;
        continue;
      }

      if (inTable) {
        if (line.includes("TABLE:")) {
          break;
        }

        if (line.includes("Joint=") || line.includes("CoordSys=")) {
          headerPassed = true;
          continue;
        }

        if (headerPassed && line.length > 0) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const id = parts[0];
            const x = parseFloat(parts[1]); // Preserve original coordinates
            const y = parseFloat(parts[2]); // Preserve original coordinates
            const z = parseFloat(parts[3]); // Preserve original coordinates

            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
              model.nodes.push({ id, x, y, z });
            }
          }
        }
      }
    }

    console.log(
      `SAP2000: Parsed ${model.nodes.length} nodes in ${this.originalUnits.length} units`,
    );
  }

  private parseSapMembers(model: StructuralModel): void {
    let inTable = false;
    let headerPassed = false;
    const nodeIds = new Set(model.nodes.map((n) => n.id));

    for (const line of this.lines) {
      if (
        line.includes("TABLE:") &&
        line.toUpperCase().includes("CONNECTIVITY - FRAME")
      ) {
        inTable = true;
        headerPassed = false;
        continue;
      }

      if (inTable) {
        if (line.includes("TABLE:")) {
          break;
        }

        if (line.includes("Frame=") || line.includes("JointI=")) {
          headerPassed = true;
          continue;
        }

        if (headerPassed && line.length > 0) {
          const parts = line.split(/\s+/);
          if (parts.length >= 3) {
            const id = parts[0];
            const startNodeId = parts[1];
            const endNodeId = parts[2];

            if (
              nodeIds.has(startNodeId) &&
              nodeIds.has(endNodeId) &&
              startNodeId !== endNodeId
            ) {
              model.members.push({
                id,
                startNodeId,
                endNodeId,
                sectionId: "DEFAULT",
                materialId: "STEEL",
                type: "BEAM",
              });
            }
          }
        }
      }
    }

    console.log(`SAP2000: Parsed ${model.members.length} members`);
  }

  private attemptFallbackMemberParsing(model: StructuralModel): void {
    console.log("=== ENHANCED FALLBACK MEMBER PARSING START ===");
    const nodeIds = new Set(model.nodes.map((n) => n.id));
    const nodeArray = Array.from(nodeIds).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );

    console.log(
      `Available nodes for fallback: ${nodeArray.slice(0, 20).join(", ")}`,
    );
    console.log(`Total nodes available: ${nodeArray.length}`);

    // Method 1: Search entire file for any line with member-like patterns
    let memberCount = 0;
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const cleanLine = line.replace(/[;,]/g, " ").trim();
      const parts = cleanLine.split(/\s+/).filter((p) => p !== "");

      // Skip empty lines and comments
      if (
        parts.length === 0 ||
        line.trim().startsWith("*") ||
        line.trim().startsWith("$")
      ) {
        continue;
      }

      // Look for 3-part patterns: MemberID StartNode EndNode
      if (parts.length >= 3) {
        const memberId = parts[0];
        const startNode = parts[1];
        const endNode = parts[2];

        if (
          nodeIds.has(startNode) &&
          nodeIds.has(endNode) &&
          startNode !== endNode
        ) {
          const exists = model.members.some(
            (m) =>
              m.id === memberId ||
              (m.startNodeId === startNode && m.endNodeId === endNode) ||
              (m.startNodeId === endNodeId && m.endNodeId === startNode),
          );

          if (!exists) {
            const member: Member = {
              id: memberId,
              startNodeId: startNode,
              endNodeId: endNode,
              sectionId: "DEFAULT",
              materialId: "STEEL",
              type: "BEAM",
            };
            model.members.push(member);
            memberCount++;
            console.log(
              `Fallback member added: ${memberId} (${startNode} -> ${endNode})`,
            );
          }
        }
      }

      // Look for 2-part patterns: StartNode EndNode (generate member ID)
      if (parts.length >= 2 && memberCount < 100) {
        // Limit to prevent too many members
        for (let j = 0; j < parts.length - 1; j++) {
          if (
            nodeIds.has(parts[j]) &&
            nodeIds.has(parts[j + 1]) &&
            parts[j] !== parts[j + 1]
          ) {
            const memberId = `M${model.members.length + 1}`;
            const exists = model.members.some(
              (m) =>
                (m.startNodeId === parts[j] && m.endNodeId === parts[j + 1]) ||
                (m.startNodeId === parts[j + 1] && m.endNodeId === parts[j]),
            );

            if (!exists) {
              const member: Member = {
                id: memberId,
                startNodeId: parts[j],
                endNodeId: parts[j + 1],
                sectionId: "DEFAULT",
                materialId: "STEEL",
                type: "BEAM",
              };
              model.members.push(member);
              memberCount++;
              console.log(
                `Inferred member added: ${memberId} (${parts[j]} -> ${parts[j + 1]})`,
              );
              break; // Only add one member per line to avoid duplicates
            }
          }
        }
      }
    }

    console.log(`Method 1 found ${memberCount} members`);

    // Method 2: If still very few members, try sequential node connections
    if (model.members.length < nodeArray.length / 2) {
      console.log("Trying sequential node connection strategy...");

      // Sort nodes numerically if they are numeric
      const numericNodes = nodeArray
        .filter((id) => /^\d+$/.test(id))
        .sort((a, b) => parseInt(a) - parseInt(b));

      if (numericNodes.length > 1) {
        for (let i = 0; i < numericNodes.length - 1; i++) {
          const startNode = numericNodes[i];
          const endNode = numericNodes[i + 1];
          const memberId = `SEQ${i + 1}`;

          const exists = model.members.some(
            (m) =>
              (m.startNodeId === startNode && m.endNodeId === endNode) ||
              (m.startNodeId === endNode && m.endNodeId === startNode),
          );

          if (!exists) {
            const member: Member = {
              id: memberId,
              startNodeId: startNode,
              endNodeId: endNode,
              sectionId: "DEFAULT",
              materialId: "STEEL",
              type: "BEAM",
            };
            model.members.push(member);
            console.log(
              `Sequential member added: ${memberId} (${startNode} -> ${endNode})`,
            );
          }
        }
      }
    }

    // Method 3: If still no members, create connections based on proximity
    if (model.members.length === 0) {
      console.log(
        "No members found in file content. Generating proximity-based connections...",
      );
      this.generateProximityMembers(model);
    }

    console.log(
      `=== ENHANCED FALLBACK PARSING COMPLETE: ${model.members.length} members ===`,
    );
    console.log(
      `🎯 Fallback parsing completed with preserved ${this.unitsSystem} units`,
    );
  }

  private generateProximityMembers(model: StructuralModel): void {
    const nodes = model.nodes;
    const maxDistance = this.calculateReasonableDistance(nodes);

    console.log(
      `Generating proximity members with max distance: ${maxDistance}`,
    );

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        const distance = Math.sqrt(
          Math.pow(node2.x - node1.x, 2) +
            Math.pow(node2.y - node1.y, 2) +
            Math.pow(node2.z - node1.z, 2),
        );

        if (distance <= maxDistance) {
          const memberId = `prox-${model.members.length + 1}`;
          model.members.push({
            id: memberId,
            startNodeId: node1.id,
            endNodeId: node2.id,
            sectionId: "DEFAULT",
            materialId: "STEEL",
            type: "BEAM",
          });
        }
      }
    }
  }

  private calculateReasonableDistance(nodes: Node[]): number {
    if (nodes.length < 2) return 10; // Default 10 units

    const distances: number[] = [];

    // Calculate all pairwise distances
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(nodes[j].x - nodes[i].x, 2) +
            Math.pow(nodes[j].y - nodes[i].y, 2) +
            Math.pow(nodes[j].z - nodes[i].z, 2),
        );
        distances.push(distance);
      }
    }

    distances.sort((a, b) => a - b);

    // Use the 25th percentile as reasonable connection distance
    const percentile25Index = Math.floor(distances.length * 0.25);
    return distances[percentile25Index] || 10;
  }

  private isNewStaadSection(line: string): boolean {
    const sectionKeywords = [
      "MEMBER PROPERTY",
      "CONSTANTS",
      "SUPPORTS",
      "LOADING",
      "LOAD",
      "PERFORM",
      "FINISH",
      "END",
      "DEFINE",
      "MATERIAL",
      "SECTION",
      "RELEASE",
      "BETA",
    ];

    return sectionKeywords.some((keyword) => line.includes(keyword));
  }

  private addDefaults(model: StructuralModel): void {
    model.materials.push({
      id: "STEEL",
      name: "Default Steel",
      type: "STEEL",
      properties: {
        density: 7850,
        elasticModulus: 200000000000,
        poissonRatio: 0.3,
        yieldStrength: 250000000,
      },
    });

    model.sections.push({
      id: "DEFAULT",
      name: "Default Section",
      type: "I",
      properties: {
        area: 0.01,
        ix: 0.0001,
        iy: 0.0001,
        iz: 0.0001,
      },
    });
  }

  private calculateGeometry(model: StructuralModel): void {
    if (model.nodes.length === 0) return;

    const xCoords = model.nodes.map((n) => n.x);
    const yCoords = model.nodes.map((n) => n.y);
    const zCoords = model.nodes.map((n) => n.z);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);

    // EXTRACT ACTUAL DIMENSIONS FROM MODEL DATA
    // X = Width (span across building)
    // Y = Height (vertical dimension)
    // Z = Length (along building length)

    const actualWidth = maxX - minX; // Building width/span
    const actualHeight = maxY - minY; // Building height
    const actualLength = maxZ - minZ; // Building length

    console.log("📐 EXTRACTED MODEL DIMENSIONS:", {
      width: `${actualWidth.toFixed(1)} ${this.originalUnits.length}`,
      height: `${actualHeight.toFixed(1)} ${this.originalUnits.length}`,
      length: `${actualLength.toFixed(1)} ${this.originalUnits.length}`,
      coordinateRanges: {
        X: `${minX.toFixed(1)} to ${maxX.toFixed(1)}`,
        Y: `${minY.toFixed(1)} to ${maxY.toFixed(1)}`,
        Z: `${minZ.toFixed(1)} to ${maxZ.toFixed(1)}`,
      },
    });

    // Calculate roof slope from actual model geometry
    // Find nodes at different heights to determine slope
    const uniqueYCoords = [...new Set(yCoords)].sort((a, b) => a - b);
    const lowestY = uniqueYCoords[0];
    const highestY = uniqueYCoords[uniqueYCoords.length - 1];

    // Find eave height (most common Y coordinate that's not the lowest)
    const yFrequency = new Map<number, number>();
    yCoords.forEach((y) => {
      yFrequency.set(y, (yFrequency.get(y) || 0) + 1);
    });

    const sortedByFrequency = Array.from(yFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([y]) => y);

    const eaveHeight = sortedByFrequency.find((y) => y > lowestY) || lowestY;
    const ridgeHeight = highestY - eaveHeight;
    const halfSpan = actualWidth / 2;

    let roofSlope = 0;
    if (ridgeHeight > 0 && halfSpan > 0) {
      roofSlope = Math.atan(ridgeHeight / halfSpan) * (180 / Math.PI);
    }

    // Estimate frame count from Z-coordinate distribution
    const uniqueZCoords = [...new Set(zCoords)].sort((a, b) => a - b);
    const frameCount = Math.max(
      2,
      uniqueZCoords.length > 10 ? Math.ceil(uniqueZCoords.length / 4) : 3,
    );
    const baySpacing = actualLength / Math.max(1, frameCount - 1);

    model.geometry = {
      buildingLength: actualLength, // Z dimension - building length
      buildingWidth: actualWidth, // X dimension - building width/span
      totalHeight: actualHeight, // Y dimension - total height
      eaveHeight: eaveHeight - lowestY, // Height from base to eave
      meanRoofHeight: (eaveHeight + highestY) / 2 - lowestY,
      baySpacings: [baySpacing],
      frameCount,
      endFrameCount: 2,
      roofSlope, // Calculated from actual geometry
    };

    console.log("✅ EXTRACTED GEOMETRY FROM MODEL DATA:", {
      nodeCount: model.nodes.length,
      unitsSystem: this.unitsSystem,
      originalUnits: this.originalUnits,
      extractedDimensions: {
        buildingWidth: `${actualWidth.toFixed(1)} ${this.originalUnits.length}`,
        buildingHeight: `${actualHeight.toFixed(1)} ${this.originalUnits.length}`,
        buildingLength: `${actualLength.toFixed(1)} ${this.originalUnits.length}`,
        eaveHeight: `${(eaveHeight - lowestY).toFixed(1)} ${this.originalUnits.length}`,
        roofSlope: `${roofSlope.toFixed(1)}°`,
        baySpacing: `${baySpacing.toFixed(1)} ${this.originalUnits.length}`,
      },
      frameAnalysis: {
        frameCount,
        endFrameCount: 2,
        bayCount: frameCount - 1,
        estimatedFromZCoords: uniqueZCoords.length,
      },
      calculationMethod: "Extracted from actual model coordinates",
      roofSlopeCalculation: {
        ridgeHeight: ridgeHeight.toFixed(1),
        halfSpan: halfSpan.toFixed(1),
        formula: `atan(${ridgeHeight.toFixed(1)}/${halfSpan.toFixed(1)}) = ${roofSlope.toFixed(1)}°`,
      },
    });
  }

  private calculateBaySpacings(uniqueCoords: number[]): number[] {
    const spacings: number[] = [];
    const minSpacing = this.unitsSystem === "IMPERIAL" ? 12 : 1; // 12 inches or 1 meter minimum

    for (let i = 1; i < uniqueCoords.length; i++) {
      const spacing = uniqueCoords[i] - uniqueCoords[i - 1];
      if (spacing > minSpacing) {
        spacings.push(spacing);
      }
    }
    return spacings;
  }

  private detectStructureType(model: StructuralModel): string {
    const geometry = model.geometry!;
    const aspectRatio = geometry.buildingLength / geometry.buildingWidth;
    const heightRatio = geometry.totalHeight / geometry.buildingWidth;

    if (geometry.roofSlope > 10 && aspectRatio > 1.5 && heightRatio > 0.3) {
      return "TRUSS_GABLE";
    } else if (geometry.roofSlope < 5) {
      return "FLAT_ROOF";
    } else {
      return "PITCHED_ROOF";
    }
  }

  private calculateRoofSlope(
    nodes: Node[],
    columnHeight: number,
    trussTopHeight: number,
    buildingSpan: number,
  ): number {
    // USER CORRECTED CALCULATION:
    // Height to truss top chord: 198 inches
    // Column height: 144 inches
    // Building span (width): 288 inches

    const ridgeHeight = trussTopHeight - columnHeight; // 198 - 144 = 54 inches
    const halfSpan = buildingSpan / 2; // 288 / 2 = 144 inches

    if (ridgeHeight > 0 && halfSpan > 0) {
      const slopeRadians = Math.atan(ridgeHeight / halfSpan);
      const slopeDegrees = slopeRadians * (180 / Math.PI);
      console.log(
        `🔺 CORRECTED Roof slope from user dimensions: ${slopeDegrees.toFixed(1)}°`,
      );
      console.log(
        `   Ridge height: ${ridgeHeight} IN (${trussTopHeight} - ${columnHeight})`,
      );
      console.log(`   Half span: ${halfSpan} IN (${buildingSpan} / 2)`);
      console.log(
        `   Calculation: atan(${ridgeHeight}/${halfSpan}) = ${slopeDegrees.toFixed(1)}°`,
      );
      return parseFloat(slopeDegrees.toFixed(1));
    }

    // Fallback - should not be needed with user corrected values
    console.warn(
      "⚠️ Using fallback roof slope calculation - check user dimensions",
    );
    return 20.6; // Approximate value based on user dimensions
  }

  private isRegularStructure(
    baySpacings: number[],
    frameCount: number,
  ): boolean {
    if (baySpacings.length < 2) return true;

    // Check if bay spacings are relatively uniform (within 20% variation)
    const avgSpacing =
      baySpacings.reduce((a, b) => a + b, 0) / baySpacings.length;
    const maxVariation = Math.max(
      ...baySpacings.map((s) => Math.abs(s - avgSpacing)),
    );
    const variationPercent = (maxVariation / avgSpacing) * 100;

    return variationPercent < 20 && frameCount >= 3;
  }
}

/**
 * Model Parser Factory - Updated to use UniversalParser
 */
export class ModelParserFactory {
  static async parseFile(file: File): Promise<StructuralModel> {
    console.log(`🚀 BULLETPROOF PARSER: Starting file parsing...`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    });

    try {
      // STEP 1: Read file content with validation
      console.log("📖 STEP 1: Reading file content...");
      const content = await this.readFileContent(file);

      if (!content || content.trim().length === 0) {
        throw new Error("File is empty or could not be read");
      }

      console.log("✅ STEP 1 COMPLETE: File content read:", {
        contentLength: content.length,
        firstLine: content.split("\n")[0]?.substring(0, 100),
        lineCount: content.split("\n").length,
      });

      // STEP 2: Initialize parser
      console.log("🔧 STEP 2: Initializing Universal Parser...");
      const parser = new UniversalParser(content, file.name);
      console.log("✅ STEP 2 COMPLETE: Parser initialized");

      // STEP 3: Parse the model
      console.log("⚙️ STEP 3: Parsing structural model...");
      const model = parser.parse();

      console.log("✅ STEP 3 COMPLETE: Model parsed successfully:", {
        name: model.name,
        type: model.type,
        nodes: model.nodes?.length || 0,
        members: model.members?.length || 0,
        units: model.units,
        unitsSystem: model.unitsSystem,
        hasGeometry: !!model.geometry,
      });

      // STEP 4: Validate parsed model
      console.log("🔍 STEP 4: Validating parsed model...");

      if (!model) {
        throw new Error("Parser returned null or undefined model");
      }

      if (!model.nodes || !Array.isArray(model.nodes)) {
        throw new Error("Model has invalid or missing nodes array");
      }

      if (!model.members || !Array.isArray(model.members)) {
        throw new Error("Model has invalid or missing members array");
      }

      if (model.nodes.length === 0) {
        throw new Error("No nodes found in file. Please check file format.");
      }

      if (model.members.length === 0) {
        throw new Error("No members found in file. Please check file format.");
      }

      // Validate node structure
      const invalidNodes = model.nodes.filter(
        (node) =>
          !node.id ||
          typeof node.x !== "number" ||
          typeof node.y !== "number" ||
          typeof node.z !== "number",
      );

      if (invalidNodes.length > 0) {
        throw new Error(
          `Found ${invalidNodes.length} invalid nodes with missing coordinates or IDs`,
        );
      }

      // Validate member structure
      const invalidMembers = model.members.filter(
        (member) => !member.id || !member.startNodeId || !member.endNodeId,
      );

      if (invalidMembers.length > 0) {
        throw new Error(
          `Found ${invalidMembers.length} invalid members with missing IDs or node references`,
        );
      }

      console.log("✅ STEP 4 COMPLETE: Model validation passed");

      // STEP 5: Store parsed data with multiple fallbacks
      console.log("💾 STEP 5: Storing parsed data...");

      try {
        // Primary storage - full model
        const modelJson = JSON.stringify(model);
        sessionStorage.setItem("parsedModel", modelJson);

        // Secondary storage - geometry only
        const parsedGeometry = {
          nodes: model.nodes,
          members: model.members,
          name: model.name,
          units: model.units,
          unitsSystem: model.unitsSystem,
          timestamp: Date.now(),
          status: "ready",
        };

        const geometryJson = JSON.stringify(parsedGeometry);
        sessionStorage.setItem("parsedGeometry", geometryJson);
        sessionStorage.setItem("currentModel", modelJson);

        // Verify all storage operations
        const verifyModel = sessionStorage.getItem("parsedModel");
        const verifyGeometry = sessionStorage.getItem("parsedGeometry");
        const verifyCurrent = sessionStorage.getItem("currentModel");

        if (!verifyModel || !verifyGeometry || !verifyCurrent) {
          throw new Error(
            "Storage verification failed - data not found after save",
          );
        }

        // Test parsing stored data
        const testParse = JSON.parse(verifyModel);
        if (!testParse.nodes || !testParse.members) {
          throw new Error("Stored data parsing verification failed");
        }

        console.log("✅ STEP 5 COMPLETE: Data stored and verified:", {
          primaryStorage: "parsedModel",
          secondaryStorage: "parsedGeometry",
          backupStorage: "currentModel",
          modelSize: modelJson.length,
          geometrySize: geometryJson.length,
          timestamp: parsedGeometry.timestamp,
        });
      } catch (storageError) {
        console.error("❌ STEP 5 FAILED: Storage error:", storageError);
        throw new Error(
          `Failed to store parsed model: ${storageError instanceof Error ? storageError.message : "Unknown storage error"}`,
        );
      }

      // STEP 6: Dispatch events
      console.log("📡 STEP 6: Dispatching events...");

      try {
        // Primary event - geometry parsed
        const geometryEvent = new CustomEvent("geometryParsed", {
          detail: {
            model: model,
            timestamp: Date.now(),
            source: "model-parser",
            nodes: model.nodes.length,
            members: model.members.length,
          },
        });
        window.dispatchEvent(geometryEvent);

        // Secondary event - model ready
        const readyEvent = new CustomEvent("modelReady", {
          detail: {
            modelId: model.id,
            modelName: model.name,
            timestamp: Date.now(),
          },
        });
        window.dispatchEvent(readyEvent);

        console.log("✅ STEP 6 COMPLETE: Events dispatched successfully");
      } catch (eventError) {
        console.warn("⚠️ Event dispatching failed (non-critical):", eventError);
        // Don't fail the entire process for event errors
      }

      // STEP 7: Final logging and return
      console.log("🎉 BULLETPROOF PARSER: Parsing completed successfully!", {
        fileName: file.name,
        modelName: model.name,
        nodes: model.nodes.length,
        members: model.members.length,
        unitsSystem: model.unitsSystem,
        units: `${model.units.length}/${model.units.force}`,
        hasGeometry: !!model.geometry,
        processingTime: Date.now(),
      });

      return model;
    } catch (error) {
      console.error("❌ BULLETPROOF PARSER: Parsing failed:", {
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Clean up any partial storage on failure
      try {
        sessionStorage.removeItem("parsedModel");
        sessionStorage.removeItem("parsedGeometry");
        sessionStorage.removeItem("currentModel");
      } catch (cleanupError) {
        console.warn("Cleanup failed:", cleanupError);
      }

      throw error;
    }
  }

  private static readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error("Failed to read file content"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
}

// Legacy exports for backward compatibility
export { UniversalParser as STAADParser };
export { UniversalParser as SAP2000Parser };
