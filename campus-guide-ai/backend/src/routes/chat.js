import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'can', 'campus', 'find', 'for', 'give',
  'me', 'of', 'on', 'please', 'show', 'the', 'there', 'where', 'which',
  'what', 'with', 'you', 'is', 'all', 'available', 'tell', 'about', 'building',
  'buildings', 'location', 'located', 'locate', 'coordinates', 'latitude', 'longitude',
  'that', 'can', 'i', 'does', 'not', 'me', 'campus',
]);

const SEMANTIC_GROUPS = {
  food: {
    aliases: ['canteen', 'cafeteria', 'food court', 'food', 'eat', 'eating', 'dine', 'dining', 'meal'],
    searchTerms: ['food', 'cafeteria', 'canteen', 'food court', 'mess', 'dining'],
    fields: ['name', 'type', 'description'],
  },
  library: {
    aliases: ['library', 'libraries', 'reading room', 'read', 'reading', 'study', 'studying'],
    searchTerms: ['library', 'libraries', 'reading room'],
    fields: ['name', 'type', 'description'],
  },
  hostel: {
    aliases: ['hostel', 'hostels'],
    searchTerms: ['hostel'],
    fields: ['name', 'type'],
  },
  residence: {
    aliases: ['residence', 'residential', 'accommodation', 'accommodations', 'housing', 'guest house'],
    searchTerms: ['hostel', 'residential', 'residence', 'accommodation', 'housing', 'guest house'],
    fields: ['name', 'type'],
  },
  lab: {
    aliases: ['laboratory', 'laboratories', 'lab', 'labs'],
    searchTerms: ['lab', 'laboratory'],
    fields: ['name', 'type'],
  },
  fitness: {
    aliases: ['gym', 'gyms', 'fitness centre', 'fitness center', 'exercise', 'workout', 'sports'],
    searchTerms: ['gym', 'fitness', 'exercise', 'sport', 'sports'],
    fields: ['name', 'type', 'description'],
  },
  administrative: {
    aliases: ['administrative office', 'administrative offices', 'administration', 'administrative'],
    searchTerms: ['administrative', 'administration', 'dean'],
    fields: ['name', 'type', 'description'],
  },
  office: {
    aliases: ['office', 'offices', 'post office'],
    searchTerms: ['administrative', 'administration', 'dean', 'office', 'post office'],
    fields: ['name', 'type', 'description'],
  },
  washroom: {
    aliases: ['washroom', 'washrooms', 'restroom', 'restrooms', 'toilet', 'toilets'],
    searchTerms: ['washroom', 'restroom', 'toilet'],
    fields: ['name', 'type', 'description'],
  },
  academic: {
    aliases: ['academic', 'academics'],
    searchTerms: ['academic'],
    fields: ['name', 'type', 'description'],
  },
};

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenDistanceAtMostOne(left, right) {
  if (left === right) return true;
  if (Math.min(left.length, right.length) < 5 || Math.abs(left.length - right.length) > 1) return false;

  if (left.length === right.length) {
    const mismatches = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches.push(index);
      if (mismatches.length > 2) return false;
    }
    if (mismatches.length === 1) return true;
    return mismatches.length === 2 &&
      mismatches[1] === mismatches[0] + 1 &&
      left[mismatches[0]] === right[mismatches[1]] &&
      left[mismatches[1]] === right[mismatches[0]];
  }

  const longer = left.length > right.length ? left : right;
  const shorter = left.length > right.length ? right : left;
  let longIndex = 0;
  let shortIndex = 0;
  let skipped = false;
  while (longIndex < longer.length && shortIndex < shorter.length) {
    if (longer[longIndex] === shorter[shortIndex]) {
      longIndex += 1;
      shortIndex += 1;
    } else if (skipped) {
      return false;
    } else {
      skipped = true;
      longIndex += 1;
    }
  }
  return true;
}

function detectSemanticGroup(question) {
  const questionTokens = normalize(question).split(/\s+/).filter(Boolean);
  const hasCampusQueryCue = /\b(where|find|show|list|locate|campus|all)\b/.test(normalize(question));
  if (!hasCampusQueryCue) return null;

  for (const [group, config] of Object.entries(SEMANTIC_GROUPS)) {
    for (const alias of config.aliases) {
      const aliasTokens = normalize(alias).split(/\s+/);
      if (aliasTokens.length > questionTokens.length) continue;
      for (let start = 0; start <= questionTokens.length - aliasTokens.length; start += 1) {
        const candidate = questionTokens.slice(start, start + aliasTokens.length);
        if (aliasTokens.every((token, index) => tokenDistanceAtMostOne(candidate[index], token))) {
          return group;
        }
      }
    }
  }
  return null;
}

function getIntent(question) {
  const q = normalize(question);
  if (/\b(coordinates?|latitude|longitude|gps)\b/.test(q)) return 'coordinates';
  const semanticGroup = detectSemanticGroup(question);
  if (semanticGroup) return `semantic:${semanticGroup}`;
  if (/\b(facilit(?:y|ies)|amenit(?:y|ies)|available)\b/.test(q)) return 'facilities';
  if (/\blibraries\b/.test(q) || (/\blibrary\b/.test(q) && /\b(all|list)\b/.test(q))) return 'category:library';
  if (/\b(laboratories|labs)\b/.test(q) && /\b(all|list|show|campus)\b/.test(q)) return 'category:lab';
  if (/\b(cafeteria|cafeterias|canteen|canteens|food|dining)\b/.test(q)) return 'category:food';
  if (/\b(buildings|locations)\b/.test(q) && /\b(all|list|show)\b/.test(q)) return 'all';
  if (/\b(all|list)\b/.test(q) && /\b(find|show|list)\b/.test(q)) return 'dynamic-category';
  if (/\b(where|find|locate|location|about|describe|tell me)\b/.test(q)) return 'building';
  return 'unsupported';
}

function extractSearchText(question) {
  const words = normalize(question)
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
  return words.join(' ').trim();
}

async function queryBuildings(intent, question) {
  if (intent.startsWith('semantic:')) {
    const group = SEMANTIC_GROUPS[intent.slice('semantic:'.length)];
    const patterns = group.searchTerms.map((term) =>
      `\\m${normalize(term).split(/\s+/).join('\\s+')}\\M`
    );
    const fieldExpressions = {
      name: 'name',
      type: 'type',
      description: "COALESCE(description, '')",
      zone: "COALESCE(zone, '')",
    };
    const fieldConditions = group.fields
      .map((field) => `${fieldExpressions[field]} ~* ANY($1::text[])`)
      .join('\n         OR ');
    const { rows } = await pool.query(
      `SELECT id, name, type, description, latitude, longitude, zone, is_verified
       FROM buildings
       WHERE is_verified = TRUE AND is_hidden = FALSE
         AND (${fieldConditions})
       ORDER BY name ASC`,
      [patterns]
    );
    return rows;
  }

  if (intent.startsWith('type:')) {
    const type = intent.slice('type:'.length);
    const { rows } = await pool.query(
      `SELECT id, name, type, description, latitude, longitude, zone, is_verified
       FROM buildings
       WHERE is_verified = TRUE AND is_hidden = FALSE AND LOWER(type) = LOWER($1)
       ORDER BY name ASC`,
      [type]
    );
    return rows;
  }

  if (intent.startsWith('category:')) {
    const category = intent.slice('category:'.length);
    const types = {
      library: ['library', 'libraries'],
      lab: ['lab', 'laboratory', 'laboratories'],
      food: ['food', 'cafeteria', 'canteen', 'dining'],
    }[category];
    const { rows } = await pool.query(
      `SELECT id, name, type, description, latitude, longitude, zone, is_verified
       FROM buildings
       WHERE is_verified = TRUE AND is_hidden = FALSE
         AND (LOWER(type) = ANY($1::text[]) OR LOWER(name) LIKE ANY($2::text[]))
       ORDER BY name ASC`,
      [types, types.map((type) => `%${type}%`)]
    );
    return rows;
  }

  if (intent === 'all' || intent === 'facilities') {
    const { rows } = await pool.query(
      `SELECT id, name, type, description, latitude, longitude, zone, is_verified
       FROM buildings
       WHERE is_verified = TRUE AND is_hidden = FALSE
       ORDER BY name ASC`
    );
    return rows;
  }

  const searchText = extractSearchText(question);
  if (!searchText) return [];

  const terms = searchText.split(/\s+/).filter(Boolean).slice(0, 10);
  const patterns = terms.map((term) => `%${term}%`);
  const phrasePattern = `%${searchText}%`;
  const { rows } = await pool.query(
    `SELECT id, name, type, description, latitude, longitude, zone, is_verified
     FROM buildings
     WHERE is_verified = TRUE AND is_hidden = FALSE
       AND (
         LOWER(name) LIKE LOWER($1)
         OR LOWER(name) LIKE ALL($2::text[])
         OR LOWER(COALESCE(type, '')) LIKE LOWER($1)
         OR LOWER(COALESCE(description, '')) LIKE LOWER($1)
         OR LOWER(COALESCE(zone, '')) LIKE LOWER($1)
       )
     ORDER BY
       CASE WHEN LOWER(name) = LOWER($3) THEN 0
            WHEN LOWER(name) LIKE LOWER($1) THEN 1 ELSE 2 END,
       name ASC
     LIMIT 20`,
    [phrasePattern, patterns, searchText]
  );
  return rows.length ? rows : findFuzzyBuildingMatches(question);
}

async function findFuzzyBuildingMatches(question) {
  const searchTerms = extractSearchText(question).split(/\s+/).filter(Boolean).slice(0, 8);
  if (!searchTerms.length) return [];

  const { rows } = await pool.query(
    `SELECT id, name, type, description, latitude, longitude, zone, is_verified
     FROM buildings
     WHERE is_verified = TRUE AND is_hidden = FALSE
     ORDER BY name ASC`
  );

  return rows
    .map((building) => {
      const nameTokens = normalize(building.name).split(/\s+/).filter(Boolean);
      const searchableTokens = normalize([
        building.name,
        building.type,
        building.description,
        building.zone,
      ].filter(Boolean).join(' ')).split(/\s+/).filter(Boolean);
      let score = 0;

      for (const term of searchTerms) {
        const matchingToken = searchableTokens.find((token) => tokenDistanceAtMostOne(term, token));
        if (!matchingToken) return null;
        score += matchingToken === term ? 2 : 1;
        if (nameTokens.includes(matchingToken)) score += 3;
      }

      return { building, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.building.name.localeCompare(right.building.name))
    .slice(0, 20)
    .map(({ building }) => building);
}

function formatBuilding(building, includeCoordinates = false) {
  const details = [`${building.name} (${building.type})`];
  details.push(`Description: ${building.description || 'Unavailable in verified records.'}`);
  details.push(`Zone: ${building.zone || 'Unavailable in verified records.'}`);
  if (includeCoordinates) {
    const coordinatesAvailable = building.latitude != null && building.longitude != null;
    details.push(coordinatesAvailable
      ? `Coordinates: latitude ${building.latitude}, longitude ${building.longitude}.`
      : 'Coordinates are unavailable in verified records.');
  } else if (building.latitude == null || building.longitude == null) {
    details.push('Coordinates are unavailable in verified records.');
  } else {
    details.push(`Coordinates: latitude ${building.latitude}, longitude ${building.longitude}.`);
  }
  return details.join('\n');
}

function buildAnswer(intent, rows) {
  if (!rows.length) {
    return intent === 'unsupported'
      ? 'I can answer questions about verified campus buildings, categories, facilities, descriptions, zones, and recorded coordinates. I can’t answer that unrelated question from the campus database.'
      : 'I couldn’t find a matching verified campus record. The requested information is unavailable in the database.';
  }

  if (intent === 'coordinates') {
    const entries = rows.map((row) => formatBuilding(row, true));
    return entries.join('\n\n');
  }

  if (intent.startsWith('semantic:') || intent.startsWith('category:') || intent.startsWith('type:') || intent === 'all' || intent === 'facilities') {
    const heading = intent === 'facilities'
      ? `Verified campus directory records (${rows.length}):`
      : `Verified matching campus buildings (${rows.length}):`;
    return `${heading}\n\n${rows.map((row) => formatBuilding(row)).join('\n\n')}`;
  }

  if (rows.length === 1) return formatBuilding(rows[0]);
  return `I found ${rows.length} verified records that may match. Please choose the exact building name:\n\n${rows.map((row) => `${row.name} (${row.type})`).join('\n')}`;
}

function toStructuredBuilding(building) {
  const result = {
    id: building.id,
    name: building.name,
    type: building.type,
    description: building.description,
    zone: building.zone,
    is_verified: building.is_verified === true,
  };

  if (
    typeof building.latitude === 'number' && Number.isFinite(building.latitude) &&
    typeof building.longitude === 'number' && Number.isFinite(building.longitude)
  ) {
    result.latitude = building.latitude;
    result.longitude = building.longitude;
  }

  return result;
}

function answerBuildingQuestion(question, building) {
  const q = normalize(question);

  if (/\b(coordinates?|latitude|longitude|gps)\b/.test(q)) {
    if (building.latitude == null || building.longitude == null) {
      return `Coordinates for ${building.name} are unavailable in verified records.`;
    }
    return `Verified coordinates for ${building.name}: latitude ${building.latitude}, longitude ${building.longitude}.`;
  }

  if (/\b(type|category)\b/.test(q)) {
    return `${building.name} is listed as ${building.type}.`;
  }

  if (/\b(zone|area)\b/.test(q)) {
    return building.zone
      ? `${building.name} is listed in ${building.zone}.`
      : `The zone for ${building.name} is unavailable in verified records.`;
  }

  if (/\b(description|describe|about|purpose|used)\b/.test(q)) {
    return building.description
      ? `${building.name}: ${building.description}`
      : `A description for ${building.name} is unavailable in verified records.`;
  }

  if (/\b(opening|hours|schedule|route|directions|phone|contact|room|facility|facilities|staff|manager|courses|classes|events)\b/.test(q)) {
    return `That information is unavailable in the verified record for ${building.name}.`;
  }

  const buildingName = normalize(building.name);
  const refersToBuilding = /\b(it|its|this|there|building|location|place)\b/.test(q) || q.includes(buildingName);
  if (refersToBuilding && /\b(where|located|location)\b/.test(q)) {
    const zone = building.zone || 'Zone unavailable in verified records';
    const coordinates = building.latitude != null && building.longitude != null
      ? `Coordinates: latitude ${building.latitude}, longitude ${building.longitude}.`
      : 'Coordinates unavailable in verified records.';
    return `${building.name} is listed in ${zone}. ${coordinates}`;
  }

  const asksForGeneralRecord =
    /\bwhat (?:is|are) (?:it|this|the building|the location)\b/.test(q) ||
    /\bwhat do you know about\b/.test(q) ||
    /\b(?:give|show) me (?:the )?(?:details|information)\b/.test(q);
  if (refersToBuilding && asksForGeneralRecord) {
    const details = [`${building.name} (${building.type})`];
    details.push(building.description || 'Description unavailable in verified records.');
    details.push(building.zone ? `Zone: ${building.zone}.` : 'Zone unavailable in verified records.');
    details.push(building.latitude != null && building.longitude != null
      ? `Coordinates: latitude ${building.latitude}, longitude ${building.longitude}.`
      : 'Coordinates unavailable in verified records.');
    return details.join(' ');
  }

  if (refersToBuilding) {
    return `That detail is unavailable in the verified record for ${building.name}.`;
  }

  return `I can answer questions about ${building.name} using its verified record. Ask about its description, type, zone, or coordinates.`;
}

async function resolveIntent(question) {
  const normalizedQuestion = normalize(question);
  const exactNameQuery = extractSearchText(question);
  if (exactNameQuery && !/\b(all|list|show)\b/.test(normalizedQuestion)) {
    const { rows: exactMatches } = await pool.query(
      `SELECT id
       FROM buildings
       WHERE is_verified = TRUE AND is_hidden = FALSE
         AND LOWER(name) = LOWER($1)
       LIMIT 1`,
      [exactNameQuery]
    );
    if (exactMatches.length) return 'building';
  }

  const intent = getIntent(question);
  if (intent !== 'unsupported' && intent !== 'dynamic-category') return intent;

  const indicatesCategory = intent === 'dynamic-category' || /\b(all|list|show|find|category|type|buildings)\b/.test(normalizedQuestion);
  if (!indicatesCategory) return 'unsupported';

  const { rows } = await pool.query(
    `SELECT DISTINCT type FROM buildings
     WHERE is_verified = TRUE AND is_hidden = FALSE AND type IS NOT NULL
     ORDER BY type ASC`
  );
  const matches = rows
    .map(({ type }) => ({ type, normalizedType: normalize(type) }))
    .filter(({ normalizedType }) => {
      const plural = normalizedType.endsWith('y')
        ? `${normalizedType.slice(0, -1)}ies`
        : `${normalizedType}s`;
      return normalizedQuestion.includes(normalizedType) || normalizedQuestion.includes(plural);
    })
    .sort((a, b) => b.normalizedType.length - a.normalizedType.length);

  return matches.length ? `type:${matches[0].type}` : 'unsupported';
}

router.post('/', async (req, res) => {
  const question = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!question) {
    return res.status(400).json({ success: false, message: 'Please enter a question.' });
  }
  if (question.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Question is too long. Please keep it under 1000 characters.',
    });
  }

  const buildingId = req.body?.buildingId;
  if (buildingId !== undefined) {
    if (
      typeof buildingId !== 'string' ||
      !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(buildingId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid building ID is required for building-specific questions.',
      });
    }

    try {
      const { rows } = await pool.query(
        `SELECT id, name, type, description, latitude, longitude, zone, is_verified
         FROM buildings
         WHERE id::text = $1 AND is_verified = TRUE AND is_hidden = FALSE
         LIMIT 1`,
        [buildingId]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: 'That verified campus building is not available.',
        });
      }

      const building = rows[0];
      return res.json({
        success: true,
        provider: 'database',
        verified: true,
        answer: answerBuildingQuestion(question, building),
        contextBuilding: toStructuredBuilding(building),
      });
    } catch (error) {
      console.error('POST /api/chat building lookup failed:', error?.message || 'Unknown database error');
      return res.status(500).json({
        success: false,
        message: 'The verified campus building could not be loaded right now. Please try again.',
      });
    }
  }

  try {
    const intent = await resolveIntent(question);
    const locations = intent === 'unsupported' ? [] : await queryBuildings(intent, question);
    const buildings = locations.map(toStructuredBuilding);
    return res.json({
      success: true,
      provider: 'database',
      verified: true,
      answer: buildAnswer(intent, locations),
      buildings,
      locations: buildings,
    });
  } catch (error) {
    console.error('POST /api/chat database query failed:', error?.message || 'Unknown database error');
    return res.status(500).json({
      success: false,
      message: 'Campus records could not be searched right now. Please try again.',
    });
  }
});

export default router;
