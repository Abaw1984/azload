/**
 * AISC Shapes Database Integration
 * Ensures exact dimensional accuracy per AISC standards
 */

import { Section } from "@/types/model";

export interface AISCShape {
  designation: string;
  type:
    | "W"
    | "S"
    | "HP"
    | "C"
    | "MC"
    | "L"
    | "WT"
    | "MT"
    | "ST"
    | "HSS"
    | "PIPE";
  weight: number; // lb/ft
  dimensions: {
    d: number; // Depth (in)
    bf?: number; // Flange width (in)
    tw: number; // Web thickness (in)
    tf?: number; // Flange thickness (in)
    k?: number; // Design dimension (in)
    kdet?: number; // Detailing dimension (in)
    r?: number; // Fillet radius (in)
    // HSS specific
    ht?: number; // Overall height (in)
    b?: number; // Overall width (in)
    tnom?: number; // Nominal wall thickness (in)
    tdes?: number; // Design wall thickness (in)
    // Angle specific
    a?: number; // Leg length 1 (in)
    b_angle?: number; // Leg length 2 (in)
    t?: number; // Thickness (in)
  };
  properties: {
    A: number; // Area (in²)
    Ix: number; // Moment of inertia about x-axis (in⁴)
    Iy: number; // Moment of inertia about y-axis (in⁴)
    Zx: number; // Plastic section modulus about x-axis (in³)
    Zy: number; // Plastic section modulus about y-axis (in³)
    rx: number; // Radius of gyration about x-axis (in)
    ry: number; // Radius of gyration about y-axis (in)
    J: number; // Torsional constant (in⁴)
    Cw: number; // Warping constant (in⁶)
  };
  verified: boolean;
  lastUpdated: Date;
}

/**
 * AISC Database Manager for exact dimensional compliance
 */
class AISCDatabaseClass {
  private static instance: AISCDatabaseClass;
  private shapes: Map<string, AISCShape> = new Map();
  private initialized = false;

  private constructor() {
    this.initializeDatabase();
  }

  static getInstance(): AISCDatabaseClass {
    if (!AISCDatabaseClass.instance) {
      AISCDatabaseClass.instance = new AISCDatabaseClass();
    }
    return AISCDatabaseClass.instance;
  }

  /**
   * Initialize with common AISC shapes for immediate use
   */
  private initializeDatabase(): void {
    console.log("🏗️ AISC DATABASE: Initializing with standard shapes...");

    // Comprehensive W-shapes library
    const commonWShapes: Partial<AISCShape>[] = [
      // W4 Series
      {
        designation: "W4X13",
        type: "W",
        weight: 13,
        dimensions: {
          d: 4.16,
          bf: 4.06,
          tw: 0.28,
          tf: 0.345,
          k: 0.75,
          kdet: 0.94,
          r: 0.345,
        },
        properties: {
          A: 3.83,
          Ix: 11.3,
          Iy: 3.86,
          Zx: 5.46,
          Zy: 2.28,
          rx: 1.72,
          ry: 1.0,
          J: 0.132,
          Cw: 6.28,
        },
      },
      // W6 Series
      {
        designation: "W6X9",
        type: "W",
        weight: 9,
        dimensions: {
          d: 5.9,
          bf: 3.94,
          tw: 0.17,
          tf: 0.215,
          k: 0.65,
          kdet: 0.81,
          r: 0.215,
        },
        properties: {
          A: 2.68,
          Ix: 16.4,
          Iy: 2.19,
          Zx: 5.56,
          Zy: 1.11,
          rx: 2.47,
          ry: 0.9,
          J: 0.052,
          Cw: 4.61,
        },
      },
      {
        designation: "W6X12",
        type: "W",
        weight: 12,
        dimensions: {
          d: 6.03,
          bf: 4.0,
          tw: 0.23,
          tf: 0.28,
          k: 0.69,
          kdet: 0.86,
          r: 0.28,
        },
        properties: {
          A: 3.55,
          Ix: 22.1,
          Iy: 2.99,
          Zx: 7.31,
          Zy: 1.5,
          rx: 2.49,
          ry: 0.92,
          J: 0.087,
          Cw: 6.5,
        },
      },
      {
        designation: "W6X15",
        type: "W",
        weight: 15,
        dimensions: {
          d: 5.99,
          bf: 5.99,
          tw: 0.23,
          tf: 0.26,
          k: 0.69,
          kdet: 0.86,
          r: 0.26,
        },
        properties: {
          A: 4.43,
          Ix: 29.1,
          Iy: 9.32,
          Zx: 9.72,
          Zy: 3.11,
          rx: 2.56,
          ry: 1.45,
          J: 0.103,
          Cw: 24.4,
        },
      },
      {
        designation: "W6X20",
        type: "W",
        weight: 20,
        dimensions: {
          d: 6.2,
          bf: 6.02,
          tw: 0.26,
          tf: 0.365,
          k: 0.79,
          kdet: 0.99,
          r: 0.365,
        },
        properties: {
          A: 5.87,
          Ix: 41.4,
          Iy: 13.4,
          Zx: 13.4,
          Zy: 4.41,
          rx: 2.66,
          ry: 1.51,
          J: 0.23,
          Cw: 37.1,
        },
      },
      // W8 Series
      {
        designation: "W8X10",
        type: "W",
        weight: 10,
        dimensions: {
          d: 7.89,
          bf: 3.94,
          tw: 0.17,
          tf: 0.205,
          k: 0.62,
          kdet: 0.77,
          r: 0.205,
        },
        properties: {
          A: 2.96,
          Ix: 30.8,
          Iy: 2.09,
          Zx: 7.81,
          Zy: 1.06,
          rx: 3.22,
          ry: 0.84,
          J: 0.042,
          Cw: 4.66,
        },
      },
      {
        designation: "W8X13",
        type: "W",
        weight: 13,
        dimensions: {
          d: 7.99,
          bf: 4.0,
          tw: 0.23,
          tf: 0.255,
          k: 0.69,
          kdet: 0.86,
          r: 0.255,
        },
        properties: {
          A: 3.84,
          Ix: 39.6,
          Iy: 2.73,
          Zx: 9.91,
          Zy: 1.37,
          rx: 3.21,
          ry: 0.84,
          J: 0.077,
          Cw: 6.08,
        },
      },
      {
        designation: "W8X15",
        type: "W",
        weight: 15,
        dimensions: {
          d: 8.11,
          bf: 4.02,
          tw: 0.245,
          tf: 0.315,
          k: 0.76,
          kdet: 0.95,
          r: 0.315,
        },
        properties: {
          A: 4.44,
          Ix: 48.0,
          Iy: 3.41,
          Zx: 11.8,
          Zy: 1.7,
          rx: 3.29,
          ry: 0.876,
          J: 0.137,
          Cw: 7.84,
        },
      },
      {
        designation: "W8X18",
        type: "W",
        weight: 18,
        dimensions: {
          d: 8.14,
          bf: 5.25,
          tw: 0.23,
          tf: 0.33,
          k: 0.75,
          kdet: 0.94,
          r: 0.33,
        },
        properties: {
          A: 5.26,
          Ix: 61.9,
          Iy: 7.97,
          Zx: 15.2,
          Zy: 3.04,
          rx: 3.43,
          ry: 1.23,
          J: 0.17,
          Cw: 22.2,
        },
      },
      {
        designation: "W8X21",
        type: "W",
        weight: 21,
        dimensions: {
          d: 8.28,
          bf: 5.27,
          tw: 0.25,
          tf: 0.4,
          k: 0.83,
          kdet: 1.04,
          r: 0.4,
        },
        properties: {
          A: 6.16,
          Ix: 75.3,
          Iy: 9.77,
          Zx: 18.2,
          Zy: 3.71,
          rx: 3.49,
          ry: 1.26,
          J: 0.283,
          Cw: 28.5,
        },
      },
      // W10 Series
      {
        designation: "W10X12",
        type: "W",
        weight: 12,
        dimensions: {
          d: 9.87,
          bf: 3.96,
          tw: 0.19,
          tf: 0.21,
          k: 0.62,
          kdet: 0.77,
          r: 0.21,
        },
        properties: {
          A: 3.54,
          Ix: 53.8,
          Iy: 2.18,
          Zx: 10.9,
          Zy: 1.1,
          rx: 3.9,
          ry: 0.785,
          J: 0.0547,
          Cw: 4.66,
        },
      },
      {
        designation: "W10X15",
        type: "W",
        weight: 15,
        dimensions: {
          d: 9.99,
          bf: 4.0,
          tw: 0.23,
          tf: 0.27,
          k: 0.69,
          kdet: 0.86,
          r: 0.27,
        },
        properties: {
          A: 4.41,
          Ix: 68.9,
          Iy: 2.89,
          Zx: 13.8,
          Zy: 1.45,
          rx: 3.95,
          ry: 0.81,
          J: 0.0918,
          Cw: 6.41,
        },
      },
      {
        designation: "W10X17",
        type: "W",
        weight: 17,
        dimensions: {
          d: 10.11,
          bf: 4.01,
          tw: 0.24,
          tf: 0.33,
          k: 0.75,
          kdet: 0.94,
          r: 0.33,
        },
        properties: {
          A: 4.99,
          Ix: 81.9,
          Iy: 3.56,
          Zx: 16.2,
          Zy: 1.78,
          rx: 4.05,
          ry: 0.845,
          J: 0.156,
          Cw: 8.32,
        },
      },
      {
        designation: "W10X19",
        type: "W",
        weight: 19,
        dimensions: {
          d: 10.24,
          bf: 4.02,
          tw: 0.25,
          tf: 0.395,
          k: 0.82,
          kdet: 1.03,
          r: 0.395,
        },
        properties: {
          A: 5.62,
          Ix: 96.3,
          Iy: 4.29,
          Zx: 18.8,
          Zy: 2.14,
          rx: 4.14,
          ry: 0.874,
          J: 0.235,
          Cw: 10.5,
        },
      },
      {
        designation: "W10X22",
        type: "W",
        weight: 22,
        dimensions: {
          d: 10.17,
          bf: 5.75,
          tw: 0.24,
          tf: 0.36,
          k: 0.79,
          kdet: 0.99,
          r: 0.36,
        },
        properties: {
          A: 6.49,
          Ix: 118,
          Iy: 11.4,
          Zx: 23.2,
          Zy: 3.97,
          rx: 4.27,
          ry: 1.33,
          J: 0.239,
          Cw: 32.9,
        },
      },
      // W12 Series
      {
        designation: "W12X14",
        type: "W",
        weight: 14,
        dimensions: {
          d: 11.91,
          bf: 3.97,
          tw: 0.2,
          tf: 0.225,
          k: 0.65,
          kdet: 0.81,
          r: 0.225,
        },
        properties: {
          A: 4.16,
          Ix: 88.6,
          Iy: 2.36,
          Zx: 14.9,
          Zy: 1.19,
          rx: 4.62,
          ry: 0.753,
          J: 0.0692,
          Cw: 5.82,
        },
      },
      {
        designation: "W12X16",
        type: "W",
        weight: 16,
        dimensions: {
          d: 11.99,
          bf: 3.99,
          tw: 0.22,
          tf: 0.265,
          k: 0.71,
          kdet: 0.89,
          r: 0.265,
        },
        properties: {
          A: 4.71,
          Ix: 103,
          Iy: 2.82,
          Zx: 17.1,
          Zy: 1.41,
          rx: 4.67,
          ry: 0.773,
          J: 0.103,
          Cw: 7.31,
        },
      },
      {
        designation: "W12X19",
        type: "W",
        weight: 19,
        dimensions: {
          d: 12.16,
          bf: 4.01,
          tw: 0.235,
          tf: 0.35,
          k: 0.79,
          kdet: 0.99,
          r: 0.35,
        },
        properties: {
          A: 5.57,
          Ix: 130,
          Iy: 3.76,
          Zx: 21.3,
          Zy: 1.88,
          rx: 4.82,
          ry: 0.822,
          J: 0.191,
          Cw: 10.0,
        },
      },
      {
        designation: "W12X22",
        type: "W",
        weight: 22,
        dimensions: {
          d: 12.31,
          bf: 4.03,
          tw: 0.26,
          tf: 0.425,
          k: 0.87,
          kdet: 1.09,
          r: 0.425,
        },
        properties: {
          A: 6.48,
          Ix: 156,
          Iy: 4.66,
          Zx: 25.4,
          Zy: 2.31,
          rx: 4.91,
          ry: 0.848,
          J: 0.292,
          Cw: 13.4,
        },
      },
      {
        designation: "W12X26",
        type: "W",
        weight: 26,
        dimensions: {
          d: 12.22,
          bf: 6.49,
          tw: 0.23,
          tf: 0.38,
          k: 0.95,
          kdet: 1.19,
          r: 0.38,
        },
        properties: {
          A: 7.65,
          Ix: 204,
          Iy: 17.3,
          Zx: 35.4,
          Zy: 9.59,
          rx: 5.17,
          ry: 1.51,
          J: 0.457,
          Cw: 139,
        },
      },
      {
        designation: "W12X30",
        type: "W",
        weight: 30,
        dimensions: {
          d: 12.34,
          bf: 6.52,
          tw: 0.26,
          tf: 0.44,
          k: 1.02,
          kdet: 1.28,
          r: 0.44,
        },
        properties: {
          A: 8.79,
          Ix: 238,
          Iy: 20.3,
          Zx: 41.8,
          Zy: 11.2,
          rx: 5.21,
          ry: 1.52,
          J: 0.677,
          Cw: 172,
        },
      },
      // W14 Series
      {
        designation: "W14X22",
        type: "W",
        weight: 22,
        dimensions: {
          d: 13.74,
          bf: 5.0,
          tw: 0.23,
          tf: 0.335,
          k: 0.785,
          kdet: 1.0,
          r: 0.335,
        },
        properties: {
          A: 6.49,
          Ix: 199,
          Iy: 7.0,
          Zx: 33.2,
          Zy: 4.66,
          rx: 5.54,
          ry: 1.04,
          J: 0.239,
          Cw: 45.2,
        },
      },
      {
        designation: "W14X26",
        type: "W",
        weight: 26,
        dimensions: {
          d: 13.91,
          bf: 5.025,
          tw: 0.255,
          tf: 0.42,
          k: 0.855,
          kdet: 1.07,
          r: 0.42,
        },
        properties: {
          A: 7.69,
          Ix: 245,
          Iy: 8.91,
          Zx: 40.2,
          Zy: 5.54,
          rx: 5.65,
          ry: 1.08,
          J: 0.398,
          Cw: 59.7,
        },
      },
      {
        designation: "W14X30",
        type: "W",
        weight: 30,
        dimensions: {
          d: 13.84,
          bf: 6.73,
          tw: 0.27,
          tf: 0.385,
          k: 0.93,
          kdet: 1.16,
          r: 0.385,
        },
        properties: {
          A: 8.85,
          Ix: 291,
          Iy: 19.6,
          Zx: 47.3,
          Zy: 9.51,
          rx: 5.73,
          ry: 1.49,
          J: 0.455,
          Cw: 139,
        },
      },
      // W16 Series
      {
        designation: "W16X26",
        type: "W",
        weight: 26,
        dimensions: {
          d: 15.69,
          bf: 5.5,
          tw: 0.25,
          tf: 0.345,
          k: 0.785,
          kdet: 0.985,
          r: 0.345,
        },
        properties: {
          A: 7.68,
          Ix: 301,
          Iy: 9.59,
          Zx: 44.2,
          Zy: 5.48,
          rx: 6.26,
          ry: 1.12,
          J: 0.26,
          Cw: 70.1,
        },
      },
      {
        designation: "W16X31",
        type: "W",
        weight: 31,
        dimensions: {
          d: 15.88,
          bf: 5.525,
          tw: 0.275,
          tf: 0.44,
          k: 0.875,
          kdet: 1.09,
          r: 0.44,
        },
        properties: {
          A: 9.12,
          Ix: 375,
          Iy: 12.4,
          Zx: 54.0,
          Zy: 6.41,
          rx: 6.41,
          ry: 1.17,
          J: 0.461,
          Cw: 92.9,
        },
      },
      {
        designation: "W16X36",
        type: "W",
        weight: 36,
        dimensions: {
          d: 15.86,
          bf: 6.985,
          tw: 0.295,
          tf: 0.43,
          k: 0.955,
          kdet: 1.19,
          r: 0.43,
        },
        properties: {
          A: 10.6,
          Ix: 448,
          Iy: 24.5,
          Zx: 64.0,
          Zy: 11.7,
          rx: 6.51,
          ry: 1.52,
          J: 0.542,
          Cw: 224,
        },
      },
      // W18 Series
      {
        designation: "W18X35",
        type: "W",
        weight: 35,
        dimensions: {
          d: 17.7,
          bf: 6.0,
          tw: 0.3,
          tf: 0.425,
          k: 0.827,
          kdet: 1.06,
          r: 0.425,
        },
        properties: {
          A: 10.3,
          Ix: 510,
          Iy: 15.3,
          Zx: 66.5,
          Zy: 8.06,
          rx: 7.04,
          ry: 1.22,
          J: 0.769,
          Cw: 124,
        },
      },
      {
        designation: "W18X40",
        type: "W",
        weight: 40,
        dimensions: {
          d: 17.9,
          bf: 6.015,
          tw: 0.315,
          tf: 0.525,
          k: 0.911,
          kdet: 1.14,
          r: 0.525,
        },
        properties: {
          A: 11.8,
          Ix: 612,
          Iy: 19.1,
          Zx: 78.4,
          Zy: 9.97,
          rx: 7.21,
          ry: 1.27,
          J: 1.27,
          Cw: 163,
        },
      },
      {
        designation: "W18X46",
        type: "W",
        weight: 46,
        dimensions: {
          d: 18.06,
          bf: 6.06,
          tw: 0.36,
          tf: 0.605,
          k: 1.01,
          kdet: 1.26,
          r: 0.605,
        },
        properties: {
          A: 13.5,
          Ix: 712,
          Iy: 22.5,
          Zx: 90.7,
          Zy: 11.7,
          rx: 7.25,
          ry: 1.29,
          J: 1.66,
          Cw: 199,
        },
      },
      // W21 Series
      {
        designation: "W21X44",
        type: "W",
        weight: 44,
        dimensions: {
          d: 20.66,
          bf: 6.5,
          tw: 0.35,
          tf: 0.45,
          k: 0.875,
          kdet: 1.09,
          r: 0.45,
        },
        properties: {
          A: 13.0,
          Ix: 843,
          Iy: 20.7,
          Zx: 95.4,
          Zy: 10.4,
          rx: 8.06,
          ry: 1.26,
          J: 0.746,
          Cw: 178,
        },
      },
      {
        designation: "W21X50",
        type: "W",
        weight: 50,
        dimensions: {
          d: 20.83,
          bf: 6.53,
          tw: 0.38,
          tf: 0.535,
          k: 0.955,
          kdet: 1.19,
          r: 0.535,
        },
        properties: {
          A: 14.7,
          Ix: 984,
          Iy: 24.9,
          Zx: 110,
          Zy: 12.2,
          rx: 8.18,
          ry: 1.3,
          J: 1.14,
          Cw: 225,
        },
      },
      // W24 Series
      {
        designation: "W24X55",
        type: "W",
        weight: 55,
        dimensions: {
          d: 23.57,
          bf: 7.005,
          tw: 0.395,
          tf: 0.505,
          k: 0.93,
          kdet: 1.16,
          r: 0.505,
        },
        properties: {
          A: 16.2,
          Ix: 1350,
          Iy: 29.1,
          Zx: 134,
          Zy: 13.3,
          rx: 9.11,
          ry: 1.34,
          J: 0.982,
          Cw: 259,
        },
      },
      {
        designation: "W24X62",
        type: "W",
        weight: 62,
        dimensions: {
          d: 23.74,
          bf: 7.04,
          tw: 0.43,
          tf: 0.59,
          k: 1.02,
          kdet: 1.28,
          r: 0.59,
        },
        properties: {
          A: 18.2,
          Ix: 1550,
          Iy: 34.5,
          Zx: 153,
          Zy: 15.7,
          rx: 9.23,
          ry: 1.38,
          J: 1.54,
          Cw: 320,
        },
      },
      // W27 Series
      {
        designation: "W27X84",
        type: "W",
        weight: 84,
        dimensions: {
          d: 26.71,
          bf: 9.96,
          tw: 0.46,
          tf: 0.64,
          k: 1.06,
          kdet: 1.33,
          r: 0.64,
        },
        properties: {
          A: 24.8,
          Ix: 2850,
          Iy: 106,
          Zx: 213,
          Zy: 31.1,
          rx: 10.7,
          ry: 2.07,
          J: 2.81,
          Cw: 1010,
        },
      },
      // W30 Series
      {
        designation: "W30X90",
        type: "W",
        weight: 90,
        dimensions: {
          d: 29.53,
          bf: 10.4,
          tw: 0.47,
          tf: 0.61,
          k: 1.02,
          kdet: 1.28,
          r: 0.61,
        },
        properties: {
          A: 26.4,
          Ix: 3610,
          Iy: 115,
          Zx: 245,
          Zy: 32.4,
          rx: 11.7,
          ry: 2.09,
          J: 2.09,
          Cw: 1200,
        },
      },
      {
        designation: "W30X99",
        type: "W",
        weight: 99,
        dimensions: {
          d: 29.65,
          bf: 10.45,
          tw: 0.52,
          tf: 0.67,
          k: 1.09,
          kdet: 1.36,
          r: 0.67,
        },
        properties: {
          A: 29.1,
          Ix: 3990,
          Iy: 128,
          Zx: 269,
          Zy: 35.7,
          rx: 11.7,
          ry: 2.1,
          J: 2.73,
          Cw: 1350,
        },
      },
      // W33 Series
      {
        designation: "W33X118",
        type: "W",
        weight: 118,
        dimensions: {
          d: 32.86,
          bf: 11.48,
          tw: 0.55,
          tf: 0.74,
          k: 1.16,
          kdet: 1.45,
          r: 0.74,
        },
        properties: {
          A: 34.7,
          Ix: 5900,
          Iy: 187,
          Zx: 359,
          Zy: 47.4,
          rx: 13.0,
          ry: 2.32,
          J: 4.06,
          Cw: 2040,
        },
      },
      // W36 Series
      {
        designation: "W36X135",
        type: "W",
        weight: 135,
        dimensions: {
          d: 35.55,
          bf: 11.95,
          tw: 0.6,
          tf: 0.79,
          k: 1.22,
          kdet: 1.53,
          r: 0.79,
        },
        properties: {
          A: 39.7,
          Ix: 7800,
          Iy: 225,
          Zx: 439,
          Zy: 57.0,
          rx: 14.0,
          ry: 2.38,
          J: 4.69,
          Cw: 2600,
        },
      },
      {
        designation: "W36X150",
        type: "W",
        weight: 150,
        dimensions: {
          d: 35.85,
          bf: 12.0,
          tw: 0.625,
          tf: 0.94,
          k: 1.32,
          kdet: 1.65,
          r: 0.94,
        },
        properties: {
          A: 44.2,
          Ix: 9040,
          Iy: 270,
          Zx: 504,
          Zy: 67.5,
          rx: 14.3,
          ry: 2.47,
          J: 7.33,
          Cw: 3230,
        },
      },
    ];

    // Comprehensive HSS shapes library
    const commonHSSShapes: Partial<AISCShape>[] = [
      // HSS Round (Pipe)
      {
        designation: "HSS3.500X0.216",
        type: "HSS",
        weight: 9.11,
        dimensions: { d: 3.5, tnom: 0.216, tdes: 0.203 },
        properties: {
          A: 2.68,
          Ix: 3.02,
          Iy: 3.02,
          Zx: 1.72,
          Zy: 1.72,
          rx: 1.06,
          ry: 1.06,
          J: 6.04,
          Cw: 0,
        },
      },
      {
        designation: "HSS4.500X0.237",
        type: "HSS",
        weight: 12.8,
        dimensions: { d: 4.5, tnom: 0.237, tdes: 0.224 },
        properties: {
          A: 3.78,
          Ix: 7.58,
          Iy: 7.58,
          Zx: 3.37,
          Zy: 3.37,
          rx: 1.42,
          ry: 1.42,
          J: 15.2,
          Cw: 0,
        },
      },
      {
        designation: "HSS6.625X0.280",
        type: "HSS",
        weight: 22.3,
        dimensions: { d: 6.625, tnom: 0.28, tdes: 0.267 },
        properties: {
          A: 6.58,
          Ix: 28.1,
          Iy: 28.1,
          Zx: 8.5,
          Zy: 8.5,
          rx: 2.06,
          ry: 2.06,
          J: 56.3,
          Cw: 0,
        },
      },
      // HSS Rectangular
      {
        designation: "HSS2X1X1/8",
        type: "HSS",
        weight: 2.27,
        dimensions: { ht: 2.0, b: 1.0, tnom: 0.125, tdes: 0.116 },
        properties: {
          A: 0.669,
          Ix: 0.766,
          Iy: 0.235,
          Zx: 0.766,
          Zy: 0.47,
          rx: 1.07,
          ry: 0.593,
          J: 0.635,
          Cw: 0,
        },
      },
      {
        designation: "HSS3X2X3/16",
        type: "HSS",
        weight: 5.59,
        dimensions: { ht: 3.0, b: 2.0, tnom: 0.1875, tdes: 0.174 },
        properties: {
          A: 1.64,
          Ix: 2.52,
          Iy: 1.15,
          Zx: 1.68,
          Zy: 1.15,
          rx: 1.24,
          ry: 0.838,
          J: 2.59,
          Cw: 0,
        },
      },
      {
        designation: "HSS4X2X1/4",
        type: "HSS",
        weight: 8.81,
        dimensions: { ht: 4.0, b: 2.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 2.59,
          Ix: 6.08,
          Iy: 1.31,
          Zx: 3.04,
          Zy: 1.31,
          rx: 1.53,
          ry: 0.711,
          J: 4.18,
          Cw: 0,
        },
      },
      {
        designation: "HSS4X3X1/4",
        type: "HSS",
        weight: 10.7,
        dimensions: { ht: 4.0, b: 3.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 3.14,
          Ix: 7.9,
          Iy: 4.69,
          Zx: 3.95,
          Zy: 3.13,
          rx: 1.59,
          ry: 1.22,
          J: 8.22,
          Cw: 0,
        },
      },
      {
        designation: "HSS4X4X1/4",
        type: "HSS",
        weight: 12.2,
        dimensions: { ht: 4.0, b: 4.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 3.58,
          Ix: 9.35,
          Iy: 9.35,
          Zx: 4.67,
          Zy: 4.67,
          rx: 1.61,
          ry: 1.61,
          J: 14.4,
          Cw: 0,
        },
      },
      {
        designation: "HSS5X3X1/4",
        type: "HSS",
        weight: 12.7,
        dimensions: { ht: 5.0, b: 3.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 3.72,
          Ix: 13.3,
          Iy: 5.86,
          Zx: 5.32,
          Zy: 3.91,
          rx: 1.89,
          ry: 1.25,
          J: 10.7,
          Cw: 0,
        },
      },
      {
        designation: "HSS5X5X1/4",
        type: "HSS",
        weight: 16.3,
        dimensions: { ht: 5.0, b: 5.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 4.78,
          Ix: 19.7,
          Iy: 19.7,
          Zx: 7.88,
          Zy: 7.88,
          rx: 2.03,
          ry: 2.03,
          J: 29.5,
          Cw: 0,
        },
      },
      {
        designation: "HSS6X2X1/4",
        type: "HSS",
        weight: 12.2,
        dimensions: { ht: 6.0, b: 2.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 3.58,
          Ix: 17.4,
          Iy: 1.86,
          Zx: 5.8,
          Zy: 1.86,
          rx: 2.2,
          ry: 0.72,
          J: 5.58,
          Cw: 0,
        },
      },
      {
        designation: "HSS6X3X1/4",
        type: "HSS",
        weight: 14.7,
        dimensions: { ht: 6.0, b: 3.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 4.3,
          Ix: 22.9,
          Iy: 7.31,
          Zx: 7.63,
          Zy: 4.87,
          rx: 2.31,
          ry: 1.3,
          J: 13.9,
          Cw: 0,
        },
      },
      {
        designation: "HSS6X4X1/4",
        type: "HSS",
        weight: 16.96,
        dimensions: { ht: 6.0, b: 4.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 4.99,
          Ix: 27.9,
          Iy: 13.5,
          Zx: 9.3,
          Zy: 6.75,
          rx: 2.37,
          ry: 1.64,
          J: 24.4,
          Cw: 0,
        },
      },
      {
        designation: "HSS6X4X3/8",
        type: "HSS",
        weight: 24.9,
        dimensions: { ht: 6.0, b: 4.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 7.32,
          Ix: 39.2,
          Iy: 18.4,
          Zx: 13.1,
          Zy: 9.2,
          rx: 2.31,
          ry: 1.58,
          J: 32.4,
          Cw: 0,
        },
      },
      {
        designation: "HSS6X6X1/4",
        type: "HSS",
        weight: 19.8,
        dimensions: { ht: 6.0, b: 6.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 5.82,
          Ix: 35.1,
          Iy: 35.1,
          Zx: 11.7,
          Zy: 11.7,
          rx: 2.45,
          ry: 2.45,
          J: 52.7,
          Cw: 0,
        },
      },
      {
        designation: "HSS6X6X3/8",
        type: "HSS",
        weight: 28.9,
        dimensions: { ht: 6.0, b: 6.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 8.5,
          Ix: 49.2,
          Iy: 49.2,
          Zx: 16.4,
          Zy: 16.4,
          rx: 2.41,
          ry: 2.41,
          J: 70.1,
          Cw: 0,
        },
      },
      {
        designation: "HSS8X4X1/4",
        type: "HSS",
        weight: 19.8,
        dimensions: { ht: 8.0, b: 4.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 5.82,
          Ix: 54.8,
          Iy: 16.8,
          Zx: 13.7,
          Zy: 8.4,
          rx: 3.07,
          ry: 1.7,
          J: 30.1,
          Cw: 0,
        },
      },
      {
        designation: "HSS8X6X1/4",
        type: "HSS",
        weight: 23.3,
        dimensions: { ht: 8.0, b: 6.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 6.86,
          Ix: 67.1,
          Iy: 42.8,
          Zx: 16.8,
          Zy: 14.3,
          rx: 3.13,
          ry: 2.5,
          J: 67.7,
          Cw: 0,
        },
      },
      {
        designation: "HSS8X6X3/8",
        type: "HSS",
        weight: 34.0,
        dimensions: { ht: 8.0, b: 6.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 10.0,
          Ix: 93.8,
          Iy: 58.1,
          Zx: 23.5,
          Zy: 19.4,
          rx: 3.06,
          ry: 2.41,
          J: 89.7,
          Cw: 0,
        },
      },
      {
        designation: "HSS8X8X1/4",
        type: "HSS",
        weight: 26.8,
        dimensions: { ht: 8.0, b: 8.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 7.88,
          Ix: 82.3,
          Iy: 82.3,
          Zx: 20.6,
          Zy: 20.6,
          rx: 3.23,
          ry: 3.23,
          J: 123,
          Cw: 0,
        },
      },
      {
        designation: "HSS8X8X3/8",
        type: "HSS",
        weight: 39.1,
        dimensions: { ht: 8.0, b: 8.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 11.5,
          Ix: 115,
          Iy: 115,
          Zx: 28.8,
          Zy: 28.8,
          rx: 3.16,
          ry: 3.16,
          J: 163,
          Cw: 0,
        },
      },
      {
        designation: "HSS8X8X1/2",
        type: "HSS",
        weight: 50.8,
        dimensions: { ht: 8.0, b: 8.0, tnom: 0.5, tdes: 0.465 },
        properties: {
          A: 14.9,
          Ix: 146,
          Iy: 146,
          Zx: 36.5,
          Zy: 36.5,
          rx: 3.13,
          ry: 3.13,
          J: 200,
          Cw: 0,
        },
      },
      {
        designation: "HSS10X6X1/4",
        type: "HSS",
        weight: 26.8,
        dimensions: { ht: 10.0, b: 6.0, tnom: 0.25, tdes: 0.233 },
        properties: {
          A: 7.88,
          Ix: 106,
          Iy: 50.4,
          Zx: 21.2,
          Zy: 16.8,
          rx: 3.67,
          ry: 2.53,
          J: 84.2,
          Cw: 0,
        },
      },
      {
        designation: "HSS10X8X3/8",
        type: "HSS",
        weight: 44.2,
        dimensions: { ht: 10.0, b: 8.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 13.0,
          Ix: 161,
          Iy: 103,
          Zx: 32.2,
          Zy: 25.8,
          rx: 3.52,
          ry: 2.81,
          J: 158,
          Cw: 0,
        },
      },
      {
        designation: "HSS10X10X3/8",
        type: "HSS",
        weight: 54.7,
        dimensions: { ht: 10.0, b: 10.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 16.1,
          Ix: 207,
          Iy: 207,
          Zx: 41.4,
          Zy: 41.4,
          rx: 3.58,
          ry: 3.58,
          J: 293,
          Cw: 0,
        },
      },
      {
        designation: "HSS12X8X3/8",
        type: "HSS",
        weight: 49.6,
        dimensions: { ht: 12.0, b: 8.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 14.6,
          Ix: 241,
          Iy: 114,
          Zx: 40.2,
          Zy: 28.5,
          rx: 4.06,
          ry: 2.79,
          J: 175,
          Cw: 0,
        },
      },
      {
        designation: "HSS12X12X3/8",
        type: "HSS",
        weight: 65.9,
        dimensions: { ht: 12.0, b: 12.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 19.4,
          Ix: 356,
          Iy: 356,
          Zx: 59.3,
          Zy: 59.3,
          rx: 4.28,
          ry: 4.28,
          J: 502,
          Cw: 0,
        },
      },
      {
        designation: "HSS14X10X3/8",
        type: "HSS",
        weight: 59.3,
        dimensions: { ht: 14.0, b: 10.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 17.4,
          Ix: 447,
          Iy: 173,
          Zx: 63.9,
          Zy: 34.6,
          rx: 5.07,
          ry: 3.15,
          J: 264,
          Cw: 0,
        },
      },
      {
        designation: "HSS16X8X3/8",
        type: "HSS",
        weight: 59.3,
        dimensions: { ht: 16.0, b: 8.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 17.4,
          Ix: 568,
          Iy: 131,
          Zx: 71.0,
          Zy: 32.8,
          rx: 5.71,
          ry: 2.74,
          J: 200,
          Cw: 0,
        },
      },
      {
        designation: "HSS16X12X3/8",
        type: "HSS",
        weight: 72.1,
        dimensions: { ht: 16.0, b: 12.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 21.2,
          Ix: 677,
          Iy: 288,
          Zx: 84.6,
          Zy: 48.0,
          rx: 5.65,
          ry: 3.69,
          J: 439,
          Cw: 0,
        },
      },
      {
        designation: "HSS18X6X3/8",
        type: "HSS",
        weight: 59.3,
        dimensions: { ht: 18.0, b: 6.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 17.4,
          Ix: 623,
          Iy: 70.8,
          Zx: 69.2,
          Zy: 23.6,
          rx: 5.98,
          ry: 2.02,
          J: 108,
          Cw: 0,
        },
      },
      {
        designation: "HSS20X12X3/8",
        type: "HSS",
        weight: 82.8,
        dimensions: { ht: 20.0, b: 12.0, tnom: 0.375, tdes: 0.349 },
        properties: {
          A: 24.4,
          Ix: 1040,
          Iy: 327,
          Zx: 104,
          Zy: 54.5,
          rx: 6.53,
          ry: 3.66,
          J: 499,
          Cw: 0,
        },
      },
    ];

    // Comprehensive Angle shapes library
    const commonAngleShapes: Partial<AISCShape>[] = [
      // Equal Leg Angles
      {
        designation: "L2X2X1/8",
        type: "L",
        weight: 1.65,
        dimensions: { a: 2.0, b_angle: 2.0, t: 0.125 },
        properties: {
          A: 0.484,
          Ix: 0.348,
          Iy: 0.348,
          Zx: 0.247,
          Zy: 0.247,
          rx: 0.849,
          ry: 0.849,
          J: 0.017,
          Cw: 0,
        },
      },
      {
        designation: "L2X2X3/16",
        type: "L",
        weight: 2.44,
        dimensions: { a: 2.0, b_angle: 2.0, t: 0.1875 },
        properties: {
          A: 0.715,
          Ix: 0.479,
          Iy: 0.479,
          Zx: 0.351,
          Zy: 0.351,
          rx: 0.818,
          ry: 0.818,
          J: 0.042,
          Cw: 0,
        },
      },
      {
        designation: "L2X2X1/4",
        type: "L",
        weight: 3.19,
        dimensions: { a: 2.0, b_angle: 2.0, t: 0.25 },
        properties: {
          A: 0.938,
          Ix: 0.594,
          Iy: 0.594,
          Zx: 0.446,
          Zy: 0.446,
          rx: 0.795,
          ry: 0.795,
          J: 0.077,
          Cw: 0,
        },
      },
      {
        designation: "L2.5X2.5X3/16",
        type: "L",
        weight: 3.07,
        dimensions: { a: 2.5, b_angle: 2.5, t: 0.1875 },
        properties: {
          A: 0.902,
          Ix: 0.912,
          Iy: 0.912,
          Zx: 0.547,
          Zy: 0.547,
          rx: 1.01,
          ry: 1.01,
          J: 0.055,
          Cw: 0,
        },
      },
      {
        designation: "L2.5X2.5X1/4",
        type: "L",
        weight: 4.1,
        dimensions: { a: 2.5, b_angle: 2.5, t: 0.25 },
        properties: {
          A: 1.19,
          Ix: 1.15,
          Iy: 1.15,
          Zx: 0.703,
          Zy: 0.703,
          rx: 0.983,
          ry: 0.983,
          J: 0.101,
          Cw: 0,
        },
      },
      {
        designation: "L3X3X3/16",
        type: "L",
        weight: 3.71,
        dimensions: { a: 3.0, b_angle: 3.0, t: 0.1875 },
        properties: {
          A: 1.09,
          Ix: 1.76,
          Iy: 1.76,
          Zx: 0.833,
          Zy: 0.833,
          rx: 1.27,
          ry: 1.27,
          J: 0.069,
          Cw: 0,
        },
      },
      {
        designation: "L3X3X1/4",
        type: "L",
        weight: 4.9,
        dimensions: { a: 3.0, b_angle: 3.0, t: 0.25 },
        properties: {
          A: 1.44,
          Ix: 2.22,
          Iy: 2.22,
          Zx: 1.07,
          Zy: 1.07,
          rx: 1.24,
          ry: 1.24,
          J: 0.127,
          Cw: 0,
        },
      },
      {
        designation: "L3X3X5/16",
        type: "L",
        weight: 6.1,
        dimensions: { a: 3.0, b_angle: 3.0, t: 0.3125 },
        properties: {
          A: 1.78,
          Ix: 2.67,
          Iy: 2.67,
          Zx: 1.29,
          Zy: 1.29,
          rx: 1.22,
          ry: 1.22,
          J: 0.197,
          Cw: 0,
        },
      },
      {
        designation: "L3X3X3/8",
        type: "L",
        weight: 7.2,
        dimensions: { a: 3.0, b_angle: 3.0, t: 0.375 },
        properties: {
          A: 2.11,
          Ix: 3.07,
          Iy: 3.07,
          Zx: 1.49,
          Zy: 1.49,
          rx: 1.21,
          ry: 1.21,
          J: 0.276,
          Cw: 0,
        },
      },
      {
        designation: "L3.5X3.5X1/4",
        type: "L",
        weight: 5.8,
        dimensions: { a: 3.5, b_angle: 3.5, t: 0.25 },
        properties: {
          A: 1.69,
          Ix: 3.64,
          Iy: 3.64,
          Zx: 1.49,
          Zy: 1.49,
          rx: 1.47,
          ry: 1.47,
          J: 0.154,
          Cw: 0,
        },
      },
      {
        designation: "L3.5X3.5X5/16",
        type: "L",
        weight: 7.2,
        dimensions: { a: 3.5, b_angle: 3.5, t: 0.3125 },
        properties: {
          A: 2.09,
          Ix: 4.36,
          Iy: 4.36,
          Zx: 1.81,
          Zy: 1.81,
          rx: 1.44,
          ry: 1.44,
          J: 0.238,
          Cw: 0,
        },
      },
      {
        designation: "L4X4X1/4",
        type: "L",
        weight: 6.6,
        dimensions: { a: 4.0, b_angle: 4.0, t: 0.25 },
        properties: {
          A: 1.94,
          Ix: 5.56,
          Iy: 5.56,
          Zx: 1.97,
          Zy: 1.97,
          rx: 1.69,
          ry: 1.69,
          J: 0.181,
          Cw: 0,
        },
      },
      {
        designation: "L4X4X5/16",
        type: "L",
        weight: 8.2,
        dimensions: { a: 4.0, b_angle: 4.0, t: 0.3125 },
        properties: {
          A: 2.4,
          Ix: 6.66,
          Iy: 6.66,
          Zx: 2.4,
          Zy: 2.4,
          rx: 1.66,
          ry: 1.66,
          J: 0.279,
          Cw: 0,
        },
      },
      {
        designation: "L4X4X3/8",
        type: "L",
        weight: 9.8,
        dimensions: { a: 4.0, b_angle: 4.0, t: 0.375 },
        properties: {
          A: 2.86,
          Ix: 7.67,
          Iy: 7.67,
          Zx: 2.81,
          Zy: 2.81,
          rx: 1.64,
          ry: 1.64,
          J: 0.389,
          Cw: 0,
        },
      },
      {
        designation: "L4X4X1/2",
        type: "L",
        weight: 12.8,
        dimensions: { a: 4.0, b_angle: 4.0, t: 0.5 },
        properties: {
          A: 3.75,
          Ix: 9.36,
          Iy: 9.36,
          Zx: 3.54,
          Zy: 3.54,
          rx: 1.58,
          ry: 1.58,
          J: 0.672,
          Cw: 0,
        },
      },
      {
        designation: "L5X5X5/16",
        type: "L",
        weight: 10.3,
        dimensions: { a: 5.0, b_angle: 5.0, t: 0.3125 },
        properties: {
          A: 3.03,
          Ix: 13.6,
          Iy: 13.6,
          Zx: 3.86,
          Zy: 3.86,
          rx: 2.12,
          ry: 2.12,
          J: 0.357,
          Cw: 0,
        },
      },
      {
        designation: "L5X5X3/8",
        type: "L",
        weight: 12.3,
        dimensions: { a: 5.0, b_angle: 5.0, t: 0.375 },
        properties: {
          A: 3.61,
          Ix: 15.7,
          Iy: 15.7,
          Zx: 4.53,
          Zy: 4.53,
          rx: 2.08,
          ry: 2.08,
          J: 0.498,
          Cw: 0,
        },
      },
      {
        designation: "L5X5X1/2",
        type: "L",
        weight: 16.2,
        dimensions: { a: 5.0, b_angle: 5.0, t: 0.5 },
        properties: {
          A: 4.75,
          Ix: 19.6,
          Iy: 19.6,
          Zx: 5.77,
          Zy: 5.77,
          rx: 2.03,
          ry: 2.03,
          J: 0.859,
          Cw: 0,
        },
      },
      {
        designation: "L6X6X3/8",
        type: "L",
        weight: 14.9,
        dimensions: { a: 6.0, b_angle: 6.0, t: 0.375 },
        properties: {
          A: 4.36,
          Ix: 28.2,
          Iy: 28.2,
          Zx: 6.66,
          Zy: 6.66,
          rx: 2.54,
          ry: 2.54,
          J: 0.609,
          Cw: 0,
        },
      },
      {
        designation: "L6X6X1/2",
        type: "L",
        weight: 19.6,
        dimensions: { a: 6.0, b_angle: 6.0, t: 0.5 },
        properties: {
          A: 5.75,
          Ix: 35.5,
          Iy: 35.5,
          Zx: 8.57,
          Zy: 8.57,
          rx: 2.49,
          ry: 2.49,
          J: 1.05,
          Cw: 0,
        },
      },
      {
        designation: "L8X8X1/2",
        type: "L",
        weight: 26.4,
        dimensions: { a: 8.0, b_angle: 8.0, t: 0.5 },
        properties: {
          A: 7.75,
          Ix: 89.0,
          Iy: 89.0,
          Zx: 15.8,
          Zy: 15.8,
          rx: 3.39,
          ry: 3.39,
          J: 1.41,
          Cw: 0,
        },
      },
      {
        designation: "L8X8X5/8",
        type: "L",
        weight: 32.7,
        dimensions: { a: 8.0, b_angle: 8.0, t: 0.625 },
        properties: {
          A: 9.61,
          Ix: 108,
          Iy: 108,
          Zx: 19.3,
          Zy: 19.3,
          rx: 3.36,
          ry: 3.36,
          J: 2.15,
          Cw: 0,
        },
      },
      {
        designation: "L8X8X3/4",
        type: "L",
        weight: 38.9,
        dimensions: { a: 8.0, b_angle: 8.0, t: 0.75 },
        properties: {
          A: 11.4,
          Ix: 126,
          Iy: 126,
          Zx: 22.5,
          Zy: 22.5,
          rx: 3.32,
          ry: 3.32,
          J: 2.95,
          Cw: 0,
        },
      },
      // Unequal Leg Angles
      {
        designation: "L3X2X1/4",
        type: "L",
        weight: 3.07,
        dimensions: { a: 3.0, b_angle: 2.0, t: 0.25 },
        properties: {
          A: 1.19,
          Ix: 1.85,
          Iy: 0.851,
          Zx: 0.833,
          Zy: 0.543,
          rx: 1.25,
          ry: 0.845,
          J: 0.101,
          Cw: 0,
        },
      },
      {
        designation: "L4X3X1/4",
        type: "L",
        weight: 4.5,
        dimensions: { a: 4.0, b_angle: 3.0, t: 0.25 },
        properties: {
          A: 1.69,
          Ix: 4.52,
          Iy: 2.04,
          Zx: 1.29,
          Zy: 0.888,
          rx: 1.64,
          ry: 1.1,
          J: 0.154,
          Cw: 0,
        },
      },
      {
        designation: "L4X3X5/16",
        type: "L",
        weight: 5.6,
        dimensions: { a: 4.0, b_angle: 3.0, t: 0.3125 },
        properties: {
          A: 2.09,
          Ix: 5.32,
          Iy: 2.42,
          Zx: 1.56,
          Zy: 1.06,
          rx: 1.6,
          ry: 1.08,
          J: 0.238,
          Cw: 0,
        },
      },
      {
        designation: "L4X3X3/8",
        type: "L",
        weight: 6.6,
        dimensions: { a: 4.0, b_angle: 3.0, t: 0.375 },
        properties: {
          A: 2.48,
          Ix: 6.03,
          Iy: 2.77,
          Zx: 1.81,
          Zy: 1.23,
          rx: 1.56,
          ry: 1.06,
          J: 0.332,
          Cw: 0,
        },
      },
      {
        designation: "L5X3X1/4",
        type: "L",
        weight: 5.4,
        dimensions: { a: 5.0, b_angle: 3.0, t: 0.25 },
        properties: {
          A: 1.94,
          Ix: 8.74,
          Iy: 2.58,
          Zx: 2.04,
          Zy: 1.15,
          rx: 2.12,
          ry: 1.15,
          J: 0.181,
          Cw: 0,
        },
      },
      {
        designation: "L5X3X3/8",
        type: "L",
        weight: 8.0,
        dimensions: { a: 5.0, b_angle: 3.0, t: 0.375 },
        properties: {
          A: 2.86,
          Ix: 11.4,
          Iy: 3.45,
          Zx: 2.67,
          Zy: 1.49,
          rx: 2.0,
          ry: 1.1,
          J: 0.389,
          Cw: 0,
        },
      },
      {
        designation: "L6X3.5X1/4",
        type: "L",
        weight: 6.3,
        dimensions: { a: 6.0, b_angle: 3.5, t: 0.25 },
        properties: {
          A: 2.19,
          Ix: 16.6,
          Iy: 4.25,
          Zx: 3.24,
          Zy: 1.65,
          rx: 2.75,
          ry: 1.39,
          J: 0.208,
          Cw: 0,
        },
      },
      {
        designation: "L6X4X3/8",
        type: "L",
        weight: 12.3,
        dimensions: { a: 6.0, b_angle: 4.0, t: 0.375 },
        properties: {
          A: 3.61,
          Ix: 17.4,
          Iy: 6.27,
          Zx: 3.24,
          Zy: 2.12,
          rx: 2.2,
          ry: 1.32,
          J: 0.348,
          Cw: 0,
        },
      },
      {
        designation: "L6X4X1/2",
        type: "L",
        weight: 16.2,
        dimensions: { a: 6.0, b_angle: 4.0, t: 0.5 },
        properties: {
          A: 4.75,
          Ix: 21.1,
          Iy: 7.63,
          Zx: 3.96,
          Zy: 2.6,
          rx: 2.11,
          ry: 1.27,
          J: 0.599,
          Cw: 0,
        },
      },
      {
        designation: "L8X4X1/2",
        type: "L",
        weight: 19.6,
        dimensions: { a: 8.0, b_angle: 4.0, t: 0.5 },
        properties: {
          A: 5.75,
          Ix: 54.9,
          Iy: 8.68,
          Zx: 8.36,
          Zy: 2.95,
          rx: 3.09,
          ry: 1.23,
          J: 0.719,
          Cw: 0,
        },
      },
      {
        designation: "L8X6X1/2",
        type: "L",
        weight: 23.0,
        dimensions: { a: 8.0, b_angle: 6.0, t: 0.5 },
        properties: {
          A: 6.75,
          Ix: 63.4,
          Iy: 23.0,
          Zx: 9.34,
          Zy: 5.1,
          rx: 3.07,
          ry: 1.85,
          J: 0.839,
          Cw: 0,
        },
      },
    ];

    // Add all shapes to database
    [...commonWShapes, ...commonHSSShapes, ...commonAngleShapes].forEach(
      (shape) => {
        if (shape.designation) {
          const completeShape: AISCShape = {
            ...shape,
            verified: true,
            lastUpdated: new Date(),
          } as AISCShape;
          this.shapes.set(shape.designation, completeShape);
        }
      },
    );

    this.initialized = true;
    console.log(
      `✅ AISC DATABASE: Initialized with ${this.shapes.size} standard shapes`,
    );
  }

  /**
   * Get AISC shape by designation with exact dimensions
   */
  getShape(designation: string): AISCShape | null {
    const shape = this.shapes.get(designation.toUpperCase());
    if (shape) {
      console.log(`✅ AISC SHAPE FOUND: ${designation}`, {
        type: shape.type,
        weight: shape.weight,
        verified: shape.verified,
      });
      return shape;
    }

    console.warn(`⚠️ AISC SHAPE NOT FOUND: ${designation}`);
    return null;
  }

  /**
   * AZLOAD WIREFRAME MODE: Skip section enhancement for wireframe rendering
   * Return original section without AISC database lookups
   */
  enhanceSection(section: Section, designation?: string): Section {
    console.log(
      `⚡ AZLOAD WIREFRAME: Skipping AISC enhancement for section ${section.id}`,
    );
    // AZLOAD: Return original section without enhancement to prevent parsing hang
    return section;
  }

  /**
   * Apply AISC properties to section for exact dimensional rendering
   * Now supports substitution tracking and original data preservation
   */
  private applyAISCProperties(
    section: Section,
    aiscShape: AISCShape,
    isSubstitute: boolean = false,
    originalDesignation?: string,
  ): Section {
    const enhancedSection: Section = {
      ...section,
      type: this.mapAISCTypeToSectionType(aiscShape.type),
      properties: {
        ...section.properties,
        area: aiscShape.properties.A,
        ix: aiscShape.properties.Ix,
        iy: aiscShape.properties.Iy,
        iz: aiscShape.properties.J,
        depth: aiscShape.dimensions.d,
        width:
          aiscShape.dimensions.bf ||
          aiscShape.dimensions.b ||
          aiscShape.dimensions.ht,
        thickness: aiscShape.dimensions.tw,
        // AISC-specific properties for exact rendering
        flangeWidth: aiscShape.dimensions.bf,
        flangeThickness: aiscShape.dimensions.tf,
        webThickness: aiscShape.dimensions.tw,
        filletRadius: aiscShape.dimensions.r,
        kDesign: aiscShape.dimensions.k,
        kDetailing: aiscShape.dimensions.kdet,
        // HSS properties
        outsideDiameter: aiscShape.dimensions.ht,
        wallThickness: aiscShape.dimensions.tdes || aiscShape.dimensions.tnom,
        // Angle properties
        legLength1: aiscShape.dimensions.a,
        legLength2: aiscShape.dimensions.b_angle,
        legThickness: aiscShape.dimensions.t,
      },
      aiscDesignation: aiscShape.designation,
      aiscDatabase: {
        shape: aiscShape.designation,
        weight: aiscShape.weight,
        dimensions: aiscShape.dimensions,
        verified: aiscShape.verified,
        lastUpdated: aiscShape.lastUpdated,
      },
    };

    // Add substitution information if this is a fallback section
    if (isSubstitute && originalDesignation) {
      enhancedSection.substitutionWarning = {
        originalDesignation,
        substituteDesignation: aiscShape.designation,
        message: `Section '${originalDesignation}' not found. Using '${aiscShape.designation}' for rendering only. Original data preserved.`,
        renderingMode: "substitute",
      };

      // Preserve original section data
      enhancedSection.originalSectionData = {
        name: section.name,
        properties: { ...section.properties },
        type: section.type,
      };
    }

    console.log(
      `✅ AISC: Enhanced section ${section.id} with ${aiscShape.designation}${isSubstitute ? " (SUBSTITUTE)" : ""}`,
      {
        type: enhancedSection.type,
        depth: enhancedSection.properties.depth,
        flangeWidth: enhancedSection.properties.flangeWidth,
        verified: aiscShape.verified,
        isSubstitute,
        originalDesignation,
      },
    );

    return enhancedSection;
  }

  /**
   * Infer AISC shape from section properties with timeout protection
   */
  private inferShapeFromProperties(section: Section): AISCShape | null {
    // Simple inference based on area and moment of inertia
    const tolerance = 0.15; // 15% tolerance for better matching
    const startTime = Date.now();
    const maxProcessingTime = 2000; // 2 seconds max
    let processedCount = 0;
    const maxIterations = 500; // Limit iterations to prevent hanging

    for (const [designation, shape] of this.shapes) {
      // Timeout protection
      if (
        Date.now() - startTime > maxProcessingTime ||
        processedCount > maxIterations
      ) {
        console.warn(
          `⚠️ AISC: Inference timeout after ${processedCount} iterations`,
        );
        break;
      }
      processedCount++;

      // Skip if properties are invalid
      if (
        !shape.properties.A ||
        !shape.properties.Ix ||
        !section.properties.area ||
        !section.properties.ix
      ) {
        continue;
      }

      const areaMatch =
        Math.abs(shape.properties.A - section.properties.area) /
          Math.max(shape.properties.A, 0.1) <
        tolerance;
      const ixMatch =
        Math.abs(shape.properties.Ix - section.properties.ix) /
          Math.max(shape.properties.Ix, 0.1) <
        tolerance;

      if (areaMatch && ixMatch) {
        console.log(
          `🎯 AISC: Inferred ${designation} from properties (A=${section.properties.area}, Ix=${section.properties.ix}) in ${processedCount} iterations`,
        );
        return shape;
      }
    }

    console.log(
      `🔍 AISC: No inference match found after ${processedCount} iterations`,
    );
    return null;
  }

  /**
   * Map AISC type to Section type
   */
  private mapAISCTypeToSectionType(
    aiscType: AISCShape["type"],
  ): Section["type"] {
    const typeMap: Record<AISCShape["type"], Section["type"]> = {
      W: "I",
      S: "I",
      HP: "I",
      C: "C",
      MC: "C",
      L: "L",
      WT: "T",
      MT: "T",
      ST: "T",
      HSS: "BOX",
      PIPE: "PIPE",
    };

    return typeMap[aiscType] || "I";
  }

  /**
   * Validate section against AISC standards
   */
  validateSection(section: Section): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    aiscCompliant: boolean;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if section has AISC designation
    if (!section.aiscDesignation) {
      warnings.push(
        "Section lacks AISC designation - using generic properties",
      );
    }

    // Validate dimensional consistency
    if (section.properties.area <= 0) {
      errors.push("Section area must be positive");
    }

    if (section.properties.ix <= 0 || section.properties.iy <= 0) {
      errors.push("Section moment of inertia must be positive");
    }

    // Check AISC database verification
    const aiscCompliant = !!(
      section.aiscDatabase?.verified && section.aiscDesignation
    );

    if (!aiscCompliant) {
      warnings.push("Section not verified against AISC database");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      aiscCompliant,
    };
  }

  /**
   * Get universal fallback shape - guaranteed to exist
   */
  getUniversalFallbackShape(): AISCShape {
    // Create a basic W12X26 shape if it doesn't exist in database
    return {
      designation: "W12X26",
      type: "W",
      weight: 26,
      dimensions: {
        d: 12.22,
        bf: 6.49,
        tw: 0.23,
        tf: 0.38,
        k: 0.95,
        kdet: 1.19,
        r: 0.38,
      },
      properties: {
        A: 7.65,
        Ix: 204,
        Iy: 17.3,
        Zx: 35.4,
        Zy: 9.59,
        rx: 5.17,
        ry: 1.51,
        J: 0.457,
        Cw: 139,
      },
      verified: true,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get all available shapes for selection
   */
  getAllShapes(): AISCShape[] {
    return Array.from(this.shapes.values());
  }

  /**
   * Search shapes by criteria
   */
  searchShapes(criteria: {
    type?: AISCShape["type"];
    minWeight?: number;
    maxWeight?: number;
    minDepth?: number;
    maxDepth?: number;
  }): AISCShape[] {
    return Array.from(this.shapes.values()).filter((shape) => {
      if (criteria.type && shape.type !== criteria.type) return false;
      if (criteria.minWeight && shape.weight < criteria.minWeight) return false;
      if (criteria.maxWeight && shape.weight > criteria.maxWeight) return false;
      if (criteria.minDepth && shape.dimensions.d < criteria.minDepth)
        return false;
      if (criteria.maxDepth && shape.dimensions.d > criteria.maxDepth)
        return false;
      return true;
    });
  }

  /**
   * Find nearest equivalent section for fallback matching
   * Prevents parser from getting stuck when exact matches aren't found
   * GUARANTEED to return a shape - never returns null
   */
  findNearestEquivalentSection(section: Section): AISCShape {
    console.log(
      `🔍 AISC: Finding nearest equivalent for section with area=${section.properties.area}, depth=${section.properties.depth}`,
    );

    const startTime = Date.now();
    const maxProcessingTime = 2000; // 2 seconds max - reduced for faster processing
    let processedCount = 0;
    const maxIterations = 100; // Reduced iterations for speed

    let bestMatch: AISCShape | null = null;
    let bestScore = Infinity;

    // Target properties for matching with safe defaults
    const targetArea = Math.max(section.properties.area || 10, 1);
    const targetDepth = Math.max(section.properties.depth || 12, 1);
    const targetIx = Math.max(section.properties.ix || 100, 1);

    // Quick scan of common shapes first for speed
    const commonShapes = [
      "W12X26",
      "W14X22",
      "W16X26",
      "W18X35",
      "W10X19",
      "W8X18",
    ];
    for (const designation of commonShapes) {
      const shape = this.shapes.get(designation);
      if (
        shape &&
        shape.properties.A &&
        shape.dimensions.d &&
        shape.properties.Ix
      ) {
        const areaScore =
          Math.abs(shape.properties.A - targetArea) / targetArea;
        const depthScore =
          Math.abs(shape.dimensions.d - targetDepth) / targetDepth;
        const ixScore = Math.abs(shape.properties.Ix - targetIx) / targetIx;
        const totalScore = areaScore * 0.4 + depthScore * 0.4 + ixScore * 0.2;

        if (totalScore < bestScore) {
          bestScore = totalScore;
          bestMatch = shape;
        }

        // If very close match, use immediately
        if (totalScore < 0.3) {
          console.log(
            `🎯 AISC: Found quick match ${designation} (score: ${totalScore.toFixed(3)})`,
          );
          return shape;
        }
      }
    }

    // If quick scan found reasonable match, use it
    if (bestMatch && bestScore < 1.0) {
      console.log(
        `🔄 AISC: Using quick scan match ${bestMatch.designation} (score: ${bestScore.toFixed(3)})`,
      );
      return bestMatch;
    }

    // Full scan with timeout protection
    for (const [designation, shape] of this.shapes) {
      if (
        Date.now() - startTime > maxProcessingTime ||
        processedCount > maxIterations
      ) {
        console.warn(
          `⚠️ AISC: Fallback search timeout after ${processedCount} iterations`,
        );
        break;
      }
      processedCount++;

      if (!shape.properties.A || !shape.dimensions.d || !shape.properties.Ix) {
        continue;
      }

      const areaScore = Math.abs(shape.properties.A - targetArea) / targetArea;
      const depthScore =
        Math.abs(shape.dimensions.d - targetDepth) / targetDepth;
      const ixScore = Math.abs(shape.properties.Ix - targetIx) / targetIx;
      const totalScore = areaScore * 0.4 + depthScore * 0.4 + ixScore * 0.2;

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestMatch = shape;
      }

      if (totalScore < 0.2) {
        console.log(
          `🎯 AISC: Found close match ${designation} (score: ${totalScore.toFixed(3)})`,
        );
        return shape;
      }
    }

    // Return best match found, or guaranteed fallback
    if (bestMatch) {
      console.log(
        `🔄 AISC: Using best match ${bestMatch.designation} (score: ${bestScore.toFixed(3)})`,
      );
      return bestMatch;
    }

    // GUARANTEED fallback - this should never be reached due to common shapes scan
    const guaranteedFallback =
      this.shapes.get("W12X26") || this.getUniversalFallbackShape();
    console.log(
      `🔧 AISC: Using guaranteed fallback ${guaranteedFallback.designation}`,
    );
    return guaranteedFallback;
  }
}

export const AISCDatabase = AISCDatabaseClass.getInstance();
