import { CodeEngineQuery, CodeEngineResponse } from '../index';

// Live Load Code Data (ASCE 7-16 Chapter 4)
export class LiveCodeData {
  private tables: Map<string, any> = new Map();
  private equations: Map<string, any> = new Map();
  private limits: Map<string, any> = new Map();

  constructor() {
    this.initializeTables();
    this.initializeEquations();
    this.initializeLimits();
  }

  private initializeTables(): void {
    // Table 4.3-1: Minimum Uniformly Distributed Live Loads
    this.tables.set('4.3-1', {
      title: 'Minimum Uniformly Distributed Live Loads and Minimum Concentrated Live Loads',
      source: 'ASCE 7-16 Table 4.3-1',
      note: 'Occupancy or use',
      data: {
        residential: {
          apartments: {
            uniform: 40,
            concentrated: 0,
            unit: 'psf',
            note: 'Private rooms and corridors serving them'
          },
          hotels: {
            uniform: 40,
            concentrated: 0,
            unit: 'psf',
            note: 'Guest rooms and corridors serving them'
          },
          dwellings: {
            uniform: 40,
            concentrated: 0,
            unit: 'psf',
            note: 'One- and two-family dwellings'
          }
        },
        institutional: {
          hospitals: {
            uniform: 40,
            concentrated: 1000,
            unit: 'psf/lbs',
            note: 'Patient rooms'
          },
          operatingRooms: {
            uniform: 60,
            concentrated: 1000,
            unit: 'psf/lbs',
            note: 'Hospitals'
          },
          laboratories: {
            uniform: 60,
            concentrated: 1000,
            unit: 'psf/lbs',
            note: 'Hospitals'
          }
        },
        educational: {
          classrooms: {
            uniform: 40,
            concentrated: 1000,
            unit: 'psf/lbs',
            note: 'Classrooms'
          },
          corridors: {
            uniform: 80,
            concentrated: 1000,
            unit: 'psf/lbs',
            note: 'Corridors above first floor'
          },
          corridorsFirstFloor: {
            uniform: 100,
            concentrated: 1000,
            unit: 'psf/lbs',
            note: 'First floor corridors'
          }
        },
        assembly: {
          fixedSeats: {
            uniform: 60,
            concentrated: 0,
            unit: 'psf',
            note: 'Assembly areas with fixed seats'
          },
          movableSeats: {
            uniform: 100,
            concentrated: 0,
            unit: 'psf',
            note: 'Assembly areas with movable seats'
          },
          stages: {
            uniform: 125,
            concentrated: 0,
            unit: 'psf',
            note: 'Stages and platforms'
          }
        },
        business: {
          offices: {
            uniform: 50,
            concentrated: 2000,
            unit: 'psf/lbs',
            note: 'Office buildings'
          },
          lobbies: {
            uniform: 100,
            concentrated: 2000,
            unit: 'psf/lbs',
            note: 'Lobbies and first floor corridors'
          }
        },
        mercantile: {
          retail: {
            uniform: 75,
            concentrated: 2000,
            unit: 'psf/lbs',
            note: 'Retail stores'
          },
          wholesale: {
            uniform: 125,
            concentrated: 3000,
            unit: 'psf/lbs',
            note: 'Wholesale stores'
          }
        },
        industrial: {
          light: {
            uniform: 125,
            concentrated: 2000,
            unit: 'psf/lbs',
            note: 'Light manufacturing'
          },
          heavy: {
            uniform: 250,
            concentrated: 3000,
            unit: 'psf/lbs',
            note: 'Heavy manufacturing'
          }
        },
        storage: {
          light: {
            uniform: 125,
            concentrated: 0,
            unit: 'psf',
            note: 'Light storage warehouses'
          },
          heavy: {
            uniform: 250,
            concentrated: 0,
            unit: 'psf',
            note: 'Heavy storage warehouses'
          }
        },
        vehicular: {
          garages: {
            uniform: 40,
            concentrated: 0,
            unit: 'psf',
            note: 'Passenger car garages'
          },
          trucksAndBuses: {
            uniform: 0,
            concentrated: 'HS20',
            unit: 'vehicle loading',
            note: 'Trucks and buses'
          }
        }
      },
      applicability: [
        'Minimum values - actual loads may be higher',
        'Concentrated loads applied over 2.5 ft × 2.5 ft area',
        'Use greater of uniform or concentrated load'
      ]
    });

    // Table 4.7-1: Live Load Element Factor KLL
    this.tables.set('4.7-1', {
      title: 'Live Load Element Factor, KLL',
      source: 'ASCE 7-16 Table 4.7-1',
      note: 'For use in determining factored load combinations',
      data: {
        interiorColumns: {
          value: 4,
          description: 'Interior columns'
        },
        exteriorColumns: {
          value: 4,
          description: 'Exterior columns without cantilever slabs'
        },
        exteriorColumnsWithCantilever: {
          value: 3,
          description: 'Exterior columns with cantilever slabs'
        },
        cornerColumns: {
          value: 3,
          description: 'Corner columns'
        },
        edgeColumns: {
          value: 2,
          description: 'Edge columns'
        },
        cantileverBeams: {
          value: 1,
          description: 'Cantilever beams'
        },
        allOtherMembers: {
          value: 2,
          description: 'All other members not specified above'
        }
      },
      applicability: [
        'For use with Equation 2.3-2',
        'Live load reduction calculations'
      ]
    });

    // Table 4.8-1: Minimum Design Loads for Materials
    this.tables.set('4.8-1', {
      title: 'Minimum Design Loads for Materials',
      source: 'ASCE 7-16 Table 4.8-1',
      note: 'Unit weights of materials',
      data: {
        concrete: {
          reinforced: {
            value: 150,
            unit: 'pcf',
            note: 'Reinforced concrete'
          },
          plain: {
            value: 145,
            unit: 'pcf',
            note: 'Plain concrete'
          },
          lightweight: {
            value: 110,
            unit: 'pcf',
            note: 'Lightweight concrete'
          }
        },
        masonry: {
          brick: {
            value: 120,
            unit: 'pcf',
            note: 'Brick masonry'
          },
          concreteBlock: {
            value: 85,
            unit: 'pcf',
            note: 'Concrete masonry units'
          }
        },
        steel: {
          structural: {
            value: 490,
            unit: 'pcf',
            note: 'Structural steel'
          }
        },
        wood: {
          softwood: {
            value: 35,
            unit: 'pcf',
            note: 'Softwood lumber'
          },
          hardwood: {
            value: 45,
            unit: 'pcf',
            note: 'Hardwood lumber'
          }
        },
        soils: {
          clay: {
            value: 100,
            unit: 'pcf',
            note: 'Clay, damp'
          },
          sand: {
            value: 100,
            unit: 'pcf',
            note: 'Sand and gravel, dry'
          }
        }
      },
      applicability: [
        'Minimum values for design',
        'Actual weights may vary'
      ]
    });
  }

  private initializeEquations(): void {
    // Equation 4.7-1: Live Load Reduction
    this.equations.set('4.7-1', {
      title: 'Live Load Reduction',
      source: 'ASCE 7-16 Equation 4.7-1',
      equation: 'L = L₀[0.25 + 15/√(KLLAT)]',
      variables: {
        L: 'Reduced design live load per unit area (psf or kN/m²)',
        L₀: 'Unreduced design live load per unit area (psf or kN/m²)',
        KLL: 'Live load element factor',
        AT: 'Tributary area (ft² or m²)'
      },
      note: 'L shall not be less than 0.50L₀ for members supporting one floor',
      limits: {
        minimum: 'L ≥ 0.40L₀ for members supporting two or more floors',
        occupancyLimits: 'No reduction for certain occupancies per Section 4.7.3'
      },
      applicability: [
        'Members with tributary area > 400 ft²',
        'Live loads > 100 psf',
        'Subject to occupancy restrictions'
      ]
    });

    // Equation 4.7-2: Alternative Live Load Reduction
    this.equations.set('4.7-2', {
      title: 'Alternative Live Load Reduction',
      source: 'ASCE 7-16 Equation 4.7-2',
      equation: 'L = L₀[0.25 + 4.57/√AT]',
      variables: {
        L: 'Reduced design live load per unit area (psf)',
        L₀: 'Unreduced design live load per unit area (psf)',
        AT: 'Tributary area (ft²)'
      },
      note: 'Alternative method when KLL is not applicable',
      applicability: [
        'One-way slabs',
        'Beams with tributary area > 150 ft²'
      ]
    });
  }

  private initializeLimits(): void {
    // Live Load Reduction Limits
    this.limits.set('reduction-limits', {
      title: 'Live Load Reduction Limitations',
      source: 'ASCE 7-16 Section 4.7',
      limits: {
        noReduction: {
          occupancies: [
            'Assembly areas',
            'Garages for passenger vehicles',
            'One- and two-family dwellings'
          ],
          note: 'No live load reduction permitted'
        },
        minimumReduction: {
          oneFloor: 0.50,
          multipleFloors: 0.40,
          note: 'Minimum percentage of unreduced live load'
        },
        tributaryArea: {
          minimum: 400,
          unit: 'ft²',
          note: 'Minimum tributary area for reduction'
        }
      }
    });

    // Concentrated Load Limits
    this.limits.set('concentrated-loads', {
      title: 'Concentrated Load Requirements',
      source: 'ASCE 7-16 Section 4.3.2',
      limits: {
        applicationArea: {
          value: 2.5,
          unit: 'ft × ft',
          note: 'Concentrated loads applied over 2.5 ft × 2.5 ft area'
        },
        loadCombination: {
          note: 'Use greater of uniform or concentrated load, not both simultaneously'
        },
        positioning: {
          note: 'Position concentrated load to produce maximum effect'
        }
      }
    });

    // Minimum Live Load Values
    this.limits.set('minimum-values', {
      title: 'Minimum Live Load Values',
      source: 'ASCE 7-16 Section 4.3',
      limits: {
        residential: {
          value: 40,
          unit: 'psf',
          note: 'Minimum for residential occupancies'
        },
        corridors: {
          value: 80,
          unit: 'psf',
          note: 'Minimum for corridors above first floor'
        },
        assembly: {
          value: 60,
          unit: 'psf',
          note: 'Minimum for assembly areas with fixed seats'
        },
        storage: {
          value: 125,
          unit: 'psf',
          note: 'Minimum for light storage'
        }
      }
    });
  }

  query(request: CodeEngineQuery): CodeEngineResponse {
    try {
      switch (request.type) {
        case 'table':
          return this.getTable(request.reference);
        case 'equation':
          return this.getEquation(request.reference);
        case 'limit':
          return this.getLimit(request.reference);
        case 'text':
          return this.getText(request.reference);
        default:
          return {
            success: false,
            error: `Unsupported query type: ${request.type}`,
            source: 'Live Code Data'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'Live Code Data'
      };
    }
  }

  private getTable(reference: string): CodeEngineResponse {
    const table = this.tables.get(reference);
    if (!table) {
      return {
        success: false,
        error: `Table ${reference} not found`,
        source: 'Live Code Data'
      };
    }

    return {
      success: true,
      data: table,
      source: table.source,
      note: table.note,
      applicabilityLimits: table.applicability
    };
  }

  private getEquation(reference: string): CodeEngineResponse {
    const equation = this.equations.get(reference);
    if (!equation) {
      return {
        success: false,
        error: `Equation ${reference} not found`,
        source: 'Live Code Data'
      };
    }

    return {
      success: true,
      data: equation,
      source: equation.source,
      note: equation.note,
      applicabilityLimits: equation.applicability
    };
  }

  private getLimit(reference: string): CodeEngineResponse {
    const limit = this.limits.get(reference);
    if (!limit) {
      return {
        success: false,
        error: `Limit ${reference} not found`,
        source: 'Live Code Data'
      };
    }

    return {
      success: true,
      data: limit,
      source: limit.source,
      note: limit.note
    };
  }

  private getText(reference: string): CodeEngineResponse {
    return {
      success: false,
      error: `Text reference ${reference} not implemented`,
      source: 'Live Code Data'
    };
  }

  exportData(): any {
    return {
      tables: Object.fromEntries(this.tables),
      equations: Object.fromEntries(this.equations),
      limits: Object.fromEntries(this.limits)
    };
  }
}
