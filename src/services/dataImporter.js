// Data Importer for Master Apps CSV
import normalizedDataService from './normalizedDataService';

class DataImporter {
  // Parse CSV data and convert to unified format
  parseMasterAppsCSV(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const apps = [];
    const filteredOut = {
      servers: 0,
      infrastructure: 0,
      invalid: 0,
      noName: 0,
      total: 0
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      filteredOut.total++;

      try {
        const values = this.parseCSVLine(line);
        if (values.length < headers.length) continue;

        const app = this.mapCSVToApp(headers, values, filteredOut);
        if (app) {
          apps.push(app);
        }
      } catch (error) {
        console.warn(`Error parsing line ${i + 1}:`, error);
      }
    }

    console.log('📊 Import Summary:');
    console.log(`  ✅ Valid applications: ${apps.length}`);
    console.log(`  🚫 Filtered out:`);
    console.log(`     - Server entries (.inovaad.org): ${filteredOut.servers}`);
    console.log(`     - Infrastructure items: ${filteredOut.infrastructure}`);
    console.log(`     - Invalid entries: ${filteredOut.invalid}`);
    console.log(`     - No name: ${filteredOut.noName}`);
    console.log(`  📈 Total processed: ${filteredOut.total}`);

    return apps;
  }

  // Parse CSV line handling quoted values
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  // Map CSV row to app object
  mapCSVToApp(headers, values, filteredOut = null) {
    const app = {};
    
    // Map each header to its value
    headers.forEach((header, index) => {
      const value = values[index] || '';
      app[header.toLowerCase().replace(/[^a-z0-9]/g, '_')] = value;
    });

    // Extract key fields
    const appName = app.app_name || '';
    const notes = app.notes || '';
    const category = app.category || '';
    const deploymentModel = app.deployment_model__verified_ || '';
    const vendorWebsite = app.vendor_website || '';
    const installationGuide = app.installation_guide_link || '';
    const canonicalVendor = app.canonical_vendor || '';
    const canonicalProduct = app.canonical_product_name || '';
    const thirdParty = app.third_party_ === 'Yes';
    const coTraveler = app.co_traveler_ === 'Yes';

    // Skip if no app name
    if (!appName) {
      if (filteredOut) filteredOut.noName++;
      return null;
    }

    // Skip server entries and infrastructure items
    if (appName.includes('.inovaad.org') || 
        appName.includes('.prod.') ||
        appName.includes('DCWVP') ||
        appName.includes('NBWVP') ||
        appName.includes('KMS') ||
        appName.includes('Server') ||
        appName.includes('Infrastructure')) {
      if (filteredOut) {
        if (appName.includes('.inovaad.org')) {
          filteredOut.servers++;
        } else {
          filteredOut.infrastructure++;
        }
      }
      return null;
    }

    // Skip empty or invalid entries
    if (appName.length < 3 || 
        appName === 'N/A' || 
        appName === 'TBD' ||
        appName === 'Unknown') {
      if (filteredOut) filteredOut.invalid++;
      return null;
    }

    // Determine entity types
    const entityTypes = [];
    if (thirdParty) entityTypes.push('third_party_app');
    if (coTraveler) entityTypes.push('co_traveler');
    if (entityTypes.length === 0) return null;

    // Create base app object
    const baseApp = {
      name: appName,
      description: this.extractDescription(notes),
      category: this.mapCategory(category),
      deploymentModel: deploymentModel,
      vendor: canonicalVendor || this.extractVendor(notes),
      productName: canonicalProduct || appName,
      website: vendorWebsite,
      installationGuide: installationGuide,
      notes: notes,
      status: this.determineStatus(notes),
      tags: this.extractTags(notes, category),
      links: this.extractLinks(vendorWebsite, installationGuide),
      lastUpdated: new Date().toISOString(),
      createdBy: 'Data Import',
      isTemplate: false,
      // Additional fields from CSV
      enrichmentStatus: app.enrichment_status || '',
      possibleDuplicate: app.possible_duplicate || '',
      canonicalKey: app.canonical_key || '',
      canonicalGroupId: app.canonical_group_id || ''
    };

    // Create separate entities for each type
    const entities = [];
    entityTypes.forEach(entityType => {
      entities.push({
        ...baseApp,
        entityType: entityType,
        id: `${entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    });

    return entities;
  }

  // Extract description from notes
  extractDescription(notes) {
    if (!notes) return '';
    
    // Look for description after the last pipe
    const parts = notes.split('|');
    const lastPart = parts[parts.length - 1].trim();
    
    // If it looks like a description (longer than 50 chars), use it
    if (lastPart.length > 50) {
      return lastPart;
    }
    
    return notes;
  }

  // Map category to standardized categories
  mapCategory(category) {
    const categoryMap = {
      'Administration / ERP': 'Administration',
      'Clinical': 'Clinical',
      'Infrastructure': 'Infrastructure',
      'Security': 'Security',
      'Communication': 'Communication',
      'Analytics': 'Analytics',
      'Development': 'Development'
    };

    return categoryMap[category] || 'Other';
  }

  // Extract vendor from notes
  extractVendor(notes) {
    if (!notes) return '';
    
    const parts = notes.split('|');
    const firstPart = parts[0].trim();
    
    // Look for vendor name (usually first part before any numbers)
    const vendorMatch = firstPart.match(/^([^0-9|]+)/);
    return vendorMatch ? vendorMatch[1].trim() : firstPart;
  }

  // Determine status from notes
  determineStatus(notes) {
    if (!notes) return 'Unknown';
    
    const statusKeywords = {
      'Retire': 'Deprecated',
      'Relocate': 'Active',
      'Retain': 'Active',
      'Redeploy': 'Active',
      'Phase I': 'Active',
      'Phase II': 'Active',
      'Critical': 'Active',
      'Important': 'Active',
      'Best Effort': 'Active'
    };

    for (const [keyword, status] of Object.entries(statusKeywords)) {
      if (notes.includes(keyword)) {
        return status;
      }
    }

    return 'Unknown';
  }

  // Extract tags from notes and category
  extractTags(notes, category) {
    const tags = [];
    
    if (category) {
      tags.push(category.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    }
    
    if (notes) {
      const tagKeywords = [
        'cloud', 'saas', 'on-premises', 'hybrid',
        'critical', 'important', 'best effort',
        'retire', 'relocate', 'retain', 'redeploy',
        'phase i', 'phase ii', 'azure', 'aws'
      ];
      
      tagKeywords.forEach(keyword => {
        if (notes.toLowerCase().includes(keyword)) {
          tags.push(keyword.replace(/\s+/g, '_'));
        }
      });
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  // Extract links from website and installation guide
  extractLinks(website, installationGuide) {
    const links = [];
    
    if (website) {
      links.push({
        type: 'url',
        label: 'Vendor Website',
        url: website.startsWith('http') ? website : `https://${website}`
      });
    }
    
    if (installationGuide) {
      links.push({
        type: 'url',
        label: 'Installation Guide',
        url: installationGuide.startsWith('http') ? installationGuide : `https://${installationGuide}`
      });
    }
    
    return links;
  }

  // Import data from CSV string
  async importMasterAppsCSV(csvData) {
    try {
      // Initialize lookup tables first
      await normalizedDataService.initializeLookupTables();
      
      const apps = this.parseMasterAppsCSV(csvData);
      console.log(`Parsed ${apps.length} apps from CSV`);
      
      // Group by entity type
      const groupedApps = apps.reduce((acc, app) => {
        if (!acc[app.entityType]) acc[app.entityType] = [];
        acc[app.entityType].push(app);
        return acc;
      }, {});

      // Import each entity type
      const results = {};
      for (const [entityType, entities] of Object.entries(groupedApps)) {
        try {
          const savedEntities = await normalizedDataService.bulkSave(entities);
          results[entityType] = {
            success: true,
            count: savedEntities.length,
            entities: savedEntities
          };
          console.log(`Imported ${savedEntities.length} ${entityType} entities`);
        } catch (error) {
          console.error(`Error importing ${entityType}:`, error);
          results[entityType] = {
            success: false,
            error: error.message,
            count: 0
          };
        }
      }

      return results;
    } catch (error) {
      console.error('Error importing CSV data:', error);
      throw error;
    }
  }

  // Get sample data for testing
  getSampleData() {
    return [
      {
        entityType: 'third_party_app',
        name: 'Microsoft Office 365',
        description: 'Cloud-based productivity suite including Word, Excel, PowerPoint, and Teams.',
        category: 'Productivity',
        vendor: 'Microsoft',
        status: 'Active',
        deploymentModel: 'Cloud / SaaS (or Hybrid)',
        tags: ['cloud', 'productivity', 'office', 'collaboration'],
        links: [
          { type: 'url', label: 'Office 365 Admin Center', url: 'https://admin.microsoft.com' }
        ],
        lastUpdated: new Date().toISOString(),
        createdBy: 'Data Import'
      },
      {
        entityType: 'co_traveler',
        name: 'Microsoft Corporation',
        description: 'Strategic technology partner providing cloud services and enterprise solutions.',
        category: 'Technology',
        vendor: 'Microsoft',
        status: 'Active',
        tags: ['cloud', 'enterprise', 'azure', 'office365'],
        links: [
          { type: 'url', label: 'Partner Portal', url: 'https://partner.microsoft.com' }
        ],
        lastUpdated: new Date().toISOString(),
        createdBy: 'Data Import'
      }
    ];
  }
}

export default new DataImporter();
