(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.hkProgramImportSession = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function clonePrograms(programs) {
    return JSON.parse(JSON.stringify(programs || {}));
  }

  function buildErrorStatus(source, code) {
    return {
      kind: 'error',
      title: 'Ошибка импорта',
      details: [`${String(source || 'source')}: ${String(code || 'unknown_error')}`],
    };
  }

  function buildSuccessPreviewStatus(source, merged, parseErrors) {
    const details = [
      `source: ${String(source || 'text')}`,
      `programs: ${merged.importedPrograms}`,
      `shortcuts: ${merged.importedShortcuts}`,
      `renamed_ids: ${merged.renamedIds}`,
    ];
    if (Array.isArray(parseErrors) && parseErrors.length) {
      details.push(`errors: ${parseErrors.length}`);
      for (const item of parseErrors) {
        details.push(`${String(item.source || 'source')}: ${String(item.code || 'unknown_error')}`);
      }
    }
    return {
      kind: 'info',
      title: 'Предпросмотр импорта готов',
      details,
    };
  }

  function buildApplyStatus(summary) {
    return {
      kind: 'success',
      title: 'Импорт применён',
      details: [
        `programs: ${summary.importedPrograms}`,
        `shortcuts: ${summary.importedShortcuts}`,
        `renamed_ids: ${summary.renamedIds}`,
      ],
    };
  }

  function buildUndoStatus() {
    return {
      kind: 'success',
      title: 'Последний импорт отменён',
      details: [],
    };
  }

  function buildPreviewFromText({ importer, currentPrograms, source, text }) {
    const parsed = importer.parseText(text);
    if (!parsed.ok) {
      return {
        ok: false,
        status: buildErrorStatus(source || 'text', parsed.code),
        preview: null,
      };
    }
    const merged = importer.mergePrograms(currentPrograms, parsed.programs);
    if (!merged.ok) {
      return {
        ok: false,
        status: buildErrorStatus(source || 'text', merged.code),
        preview: null,
      };
    }

    return {
      ok: true,
      status: buildSuccessPreviewStatus(source || 'text', merged, []),
      preview: {
        source: source || 'text',
        merged,
        parseErrors: [],
      },
    };
  }

  function buildPreviewFromSources({ importer, currentPrograms, sources }) {
    const list = Array.isArray(sources) ? sources : [];
    const parsedPrograms = [];
    const parseErrors = [];
    const sourceNames = [];

    for (const source of list) {
      const sourceName = String((source && source.source) || 'source');
      sourceNames.push(sourceName);
      if (source && source.code) {
        parseErrors.push({ source: sourceName, code: source.code });
        continue;
      }
      const parsed = importer.parseText(source && typeof source.text === 'string' ? source.text : '');
      if (!parsed.ok) {
        parseErrors.push({ source: sourceName, code: parsed.code });
        continue;
      }
      parsedPrograms.push(...parsed.programs);
    }

    if (!parsedPrograms.length) {
      return {
        ok: false,
        status: {
          kind: 'error',
          title: 'Ошибка импорта',
          details: parseErrors.length
            ? parseErrors.map((item) => `${String(item.source)}: ${String(item.code)}`)
            : ['source: no_valid_programs'],
        },
        preview: null,
      };
    }

    const merged = importer.mergePrograms(currentPrograms, parsedPrograms);
    if (!merged.ok) {
      return {
        ok: false,
        status: buildErrorStatus('files', merged.code),
        preview: null,
      };
    }

    return {
      ok: true,
      status: buildSuccessPreviewStatus(sourceNames.join(', '), merged, parseErrors),
      preview: {
        source: sourceNames.join(', '),
        merged,
        parseErrors,
      },
    };
  }

  function applyPreview({ currentPrograms, preview }) {
    if (!preview || !preview.merged || !preview.merged.programs) {
      return {
        ok: false,
        status: buildErrorStatus('preview', 'no_preview'),
      };
    }
    const lastSnapshot = clonePrograms(currentPrograms);
    const nextPrograms = clonePrograms(preview.merged.programs);
    return {
      ok: true,
      programs: nextPrograms,
      lastSnapshot,
      selectedProgramId: preview.merged.lastImportedId || '',
      status: buildApplyStatus({
        importedPrograms: preview.merged.importedPrograms || 0,
        importedShortcuts: preview.merged.importedShortcuts || 0,
        renamedIds: preview.merged.renamedIds || 0,
      }),
    };
  }

  function undoImport({ lastSnapshot }) {
    if (!lastSnapshot) {
      return {
        ok: false,
        status: buildErrorStatus('undo', 'no_snapshot'),
      };
    }
    return {
      ok: true,
      programs: clonePrograms(lastSnapshot),
      status: buildUndoStatus(),
    };
  }

  return {
    buildPreviewFromText,
    buildPreviewFromSources,
    applyPreview,
    undoImport,
  };
});
