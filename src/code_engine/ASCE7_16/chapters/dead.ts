// Replace this 

         As: 'Cross-sectional area of structural member (ft² or m²)',
        L: 'Length of structural member (ft or m)'
      },
      note: 'Weight of structural framing system',
      applicability: [
        'Steel, concrete, wood, and other structural materials',
        'Include connections and details'
      ]
    });

    // Equipment and Utility Loads
    this.equations.set('3.3-1', {
      title: 'Equipment and Utility Dead Loads',
      source: 'ASCE 7-16 Section 3.1.3',
      equation: 'De = Σ(We + Wf + Wu)',
      variables: {
        De: 'Equipment dead load (lbs or N)',
        We: 'Weight of equipment (lbs or N)',
        Wf: 'Weight of fixtures (lbs or N)',
        Wu: 'Weight of utilities (lbs or N)'
      },
      note: 'Include all permanently attached equipment',
      applicability: [
        'HVAC equipment',
        'Plumbing fixtures',
        'Electrical systems',
        'Fire protection systems'
      ]
    });
  }

  private initializeLimits(): void {
    // Minimum Dead Load Considerations
    this.limits.set('minimum-loads', {
      title: 'Minimum Dead Load Considerations',
      source: 'ASCE 7-16 Section 3.1',
      limits: {
        structuralFraming: {
          note: 'Include weight of all structural framing',
          requirement: 'Mandatory'
        },
        nonstructuralComponents: {
          note: 'Include weight of permanent nonstructural components',
          requirement: 'Mandatory'
        },
        equipment: {
          note: 'Include weight of fixed equipment',
          requirement: 'Mandatory'
        },
        partitions: {
          minimum: 20,
          unit: 'psf',
          note: 'Minimum partition allowance when locations not determined'
        }
      }
    });

    // Material Weight Tolerances
    this.limits.set('weight-tolerances', {
      title: 'Material Weight Tolerances',
      source: 'ASCE 7-16 Commentary',
      limits: {
        concrete: {
          tolerance: '±5%',
          note: 'Normal weight concrete density variation'
        },
        steel: {
          tolerance: '±2%',
          note: 'Structural steel weight variation'
        },
        masonry: {
          tolerance: '±10%',
          note: 'Masonry unit weight variation'
        },
        wood: {
          tolerance: '±15%',
          note: 'Wood weight variation due to moisture content'
        }
      }
    });

    // Construction Load Limits
    this.limits.set('construction-loads', {
      title: 'Construction Load Considerations',
      source: 'ASCE 7-16 Section 3.3',
      limits: {
        temporaryLoads: {
          note: 'Consider construction loads during erection',
          requirement: 'Design consideration'
        },
        equipmentLoads: {
          note: 'Include weight of construction equipment',
          requirement: 'Temporary design'
        },
        materialStorage: {
          note: 'Consider stored materials during construction',
          requirement: 'Temporary design'
        },
        formwork: {
          note: 'Include weight of concrete formwork and shores',
          requirement: 'Temporary design'
        }
      }
    });

    // Accuracy Requirements
    this.limits.set('accuracy-requirements', {
      title: 'Dead Load Calculation Accuracy',
      source: 'ASCE 7-16 Section 3.1',
      limits: {
        generalAccuracy: {
          note: 'Use best available data for material weights',
          requirement: 'Engineering judgment'
        },
        manufacturerData: {
          note: 'Use manufacturer data when available',
          requirement: 'Preferred method'
        },
        fieldVerification: {
          note: 'Verify actual weights during construction when critical',
          requirement: 'As needed'
        }
      }
    });
  }