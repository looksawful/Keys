(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.hkProgramImport = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function sanitizeProgramId(value, fallback, now = Date.now) {
    const normalize = (source) =>
      String(source || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

    const primary = normalize(value);
    if (primary) return primary;
    const secondary = normalize(fallback);
    if (secondary) return secondary;
    return `program_${Number(now()) || Date.now()}`;
  }

  function normalizeImportedDifficulty(value, isValidDifficulty) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    return isValidDifficulty(normalized) ? normalized : 'easy';
  }

  function getImportedProgramsList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];
    if (Array.isArray(payload.programs)) return payload.programs;
    if (Array.isArray(payload.items)) return payload.items;
    if (isObject(payload.program)) return [payload.program];

    const hasSingleProgramShape =
      typeof payload.name === 'string' ||
      typeof payload.program === 'string' ||
      typeof payload.title === 'string' ||
      Array.isArray(payload.shortcuts) ||
      Array.isArray(payload.sc) ||
      Array.isArray(payload.hotkeys);
    if (hasSingleProgramShape) return [payload];

    const entries = Object.entries(payload).filter(([, value]) => {
      if (!isObject(value)) return false;
      return (
        typeof value.name === 'string' ||
        Array.isArray(value.shortcuts) ||
        Array.isArray(value.sc) ||
        Array.isArray(value.hotkeys)
      );
    });
    if (!entries.length) return [];
    return entries.map(([id, value]) => ({ ...value, id: value.id ?? id }));
  }

  function createImporter(options) {
    const {
      normalizeKey,
      parseKeyCombo,
      formatKeyList,
      sanitizeColor,
      isValidDifficulty,
      now = Date.now,
    } = options || {};

    if (
      typeof normalizeKey !== 'function' ||
      typeof parseKeyCombo !== 'function' ||
      typeof formatKeyList !== 'function' ||
      typeof sanitizeColor !== 'function' ||
      typeof isValidDifficulty !== 'function'
    ) {
      throw new Error('Program importer dependencies are invalid.');
    }

    function normalizeImportedKeys(value) {
      if (Array.isArray(value)) {
        return formatKeyList(
          value
            .filter((key) => typeof key === 'string' && key.trim())
            .map((key) => normalizeKey(key))
            .filter(Boolean),
        );
      }
      if (typeof value === 'string') {
        return formatKeyList(parseKeyCombo(value));
      }
      return [];
    }

    function normalizeImportedShortcuts(list) {
      if (!Array.isArray(list)) return [];
      const out = [];
      const seen = new Set();
      for (const item of list) {
        if (!isObject(item)) continue;
        const actionRaw = item.action ?? item.a ?? item.name ?? item.title;
        const action = typeof actionRaw === 'string' ? actionRaw.trim() : '';
        const keysRaw = item.keys ?? item.k ?? item.combo ?? item.shortcut;
        const keys = normalizeImportedKeys(keysRaw);
        if (!action || !keys.length) continue;
        const comboId = keys.map((key) => String(key).toLowerCase()).join('+');
        if (seen.has(comboId)) continue;
        seen.add(comboId);
        out.push({
          id: out.length + 1,
          a: action,
          k: keys,
          d: normalizeImportedDifficulty(item.difficulty ?? item.d, isValidDifficulty),
        });
      }
      return out;
    }

    function normalizeImportedProgram(raw, index) {
      if (!isObject(raw)) return null;
      const nameRaw = raw.name ?? raw.program ?? raw.title;
      const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
      if (!name) return null;
      const id = sanitizeProgramId(
        raw.id ?? raw.slug ?? raw.key,
        name || `program_${index + 1}`,
        now,
      );
      const color = sanitizeColor(raw.color);
      const shortcutsSource = Array.isArray(raw.shortcuts)
        ? raw.shortcuts
        : Array.isArray(raw.sc)
          ? raw.sc
          : Array.isArray(raw.hotkeys)
            ? raw.hotkeys
            : [];
      const sc = normalizeImportedShortcuts(shortcutsSource);
      if (!sc.length) return null;
      return { id, name, color, sc };
    }

    function parsePayload(payload) {
      const candidates = getImportedProgramsList(payload);
      if (!candidates.length) {
        return {
          ok: false,
          code: 'no_programs_found',
        };
      }
      const programs = candidates
        .map((item, index) => normalizeImportedProgram(item, index))
        .filter(Boolean);
      if (!programs.length) {
        return {
          ok: false,
          code: 'no_valid_programs',
        };
      }
      return {
        ok: true,
        programs,
      };
    }

    function parseText(text) {
      const rawText = String(text || '').trim();
      if (!rawText) {
        return {
          ok: false,
          code: 'empty_text',
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          ok: false,
          code: 'invalid_json',
        };
      }
      return parsePayload(parsed);
    }

    function mergePrograms(existingPrograms, importedPrograms) {
      if (!isObject(existingPrograms)) {
        return {
          ok: false,
          code: 'invalid_programs_store',
        };
      }
      if (!Array.isArray(importedPrograms) || !importedPrograms.length) {
        return {
          ok: false,
          code: 'no_programs_to_import',
        };
      }

      const nextPrograms = { ...existingPrograms };
      let importedCount = 0;
      let importedShortcuts = 0;
      let renamedIds = 0;
      let lastImportedId = '';

      for (const program of importedPrograms) {
        if (!program || typeof program.id !== 'string' || !program.id) continue;
        const baseId = program.id;
        let uniqueId = baseId;
        let suffix = 1;
        while (nextPrograms[uniqueId]) {
          uniqueId = `${baseId}_${suffix}`;
          suffix += 1;
        }
        if (uniqueId !== baseId) renamedIds += 1;
        nextPrograms[uniqueId] = {
          name: program.name,
          color: program.color,
          sc: program.sc.map((shortcut) => ({
            id: shortcut.id,
            a: shortcut.a,
            k: shortcut.k.slice(),
            d: shortcut.d,
          })),
        };
        importedCount += 1;
        importedShortcuts += program.sc.length;
        lastImportedId = uniqueId;
      }

      if (!importedCount) {
        return {
          ok: false,
          code: 'no_valid_programs',
        };
      }

      return {
        ok: true,
        programs: nextPrograms,
        importedPrograms: importedCount,
        importedShortcuts,
        renamedIds,
        lastImportedId,
      };
    }

    return {
      parseText,
      parsePayload,
      mergePrograms,
    };
  }

  return {
    createImporter,
    sanitizeProgramId,
    normalizeImportedDifficulty,
    getImportedProgramsList,
  };
});
