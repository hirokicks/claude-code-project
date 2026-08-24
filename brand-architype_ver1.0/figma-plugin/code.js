// Figma サンドボックス環境で動作するメインロジック

figma.showUI(__html__, {
  width: 380,
  height: 600,
  title: '合成書体プラグイン'
});

// ドキュメントへの永続保存
function loadSaved() {
  try {
    const raw = figma.root.getPluginData('compositeFonts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(fonts) {
  figma.root.setPluginData('compositeFonts', JSON.stringify(fonts));
}

// 文字種判定
const LETTER_RE   = /[a-zA-ZÀ-ɏḀ-ỿ]/;
const NUMBER_RE   = /[0-9０-９]/;
// 約物: ASCII記号 + 全角記号 + 日本語句読点・括弧類・特殊文字
const PUNCT_RE    = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~　-〿！-／：-＠［-｀｛-･‐-‧‰-⁞⁠-⿿、。「-』〔〕・︐-︙︰-﹏]/;

function isSub(char, ranges) {
  if (ranges.letters    && LETTER_RE.test(char)) return true;
  if (ranges.numbers    && NUMBER_RE.test(char)) return true;
  if (ranges.punctuation && PUNCT_RE.test(char)) return true;
  return false;
}

// テキストノード 1つに合成書体を適用
async function applyCompositeToNode(node, def) {
  const mainFont = { family: def.mainFamily, style: def.mainStyle };
  const subFont  = { family: def.subFamily,  style: def.subStyle  };

  await Promise.all([
    figma.loadFontAsync(mainFont),
    figma.loadFontAsync(subFont)
  ]);

  const len = node.characters.length;
  if (len === 0) return;

  // まず全体をメイン書体に設定
  node.setRangeFontName(0, len, mainFont);

  // 連続するサブ書体対象文字をひとまとめにして適用（パフォーマンス最適化）
  const chars = node.characters;
  let runStart = -1;

  for (let i = 0; i <= len; i++) {
    const sub = i < len && isSub(chars[i], def.subRanges);
    if (sub && runStart === -1) {
      runStart = i;
    } else if (!sub && runStart !== -1) {
      node.setRangeFontName(runStart, i, subFont);
      runStart = -1;
    }
  }

  // 適用した定義IDをノードに記録（再適用時の参照用）
  node.setPluginData('appliedCompositeFontId', def.id);
}

// 選択中のノードからTEXTノードを再帰収集
function collectTextNodes(nodes) {
  const result = [];
  function walk(node) {
    if (node.type === 'TEXT') {
      result.push(node);
    } else if ('children' in node) {
      for (const child of node.children) walk(child);
    }
  }
  for (const n of nodes) walk(n);
  return result;
}


// メッセージハンドラ
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {

      case 'init': {
        const fonts = await figma.listAvailableFontsAsync();
        const saved = loadSaved();
        figma.ui.postMessage({ type: 'ready', fonts, saved });
        break;
      }

      case 'save': {
        const saved = loadSaved();
        const idx = saved.findIndex(f => f.id === msg.def.id);
        if (idx >= 0) saved[idx] = msg.def;
        else saved.push(msg.def);
        persist(saved);
        figma.ui.postMessage({ type: 'saved', saved, message: '保存しました' });
        break;
      }

      case 'delete': {
        const saved = loadSaved().filter(f => f.id !== msg.id);
        persist(saved);
        figma.ui.postMessage({ type: 'saved', saved, message: '削除しました' });
        break;
      }

      case 'apply': {
        // 選択状況に関わらず定義を先に保存（名称変更も確実に反映）
        const saved = loadSaved();
        const idx = saved.findIndex(f => f.id === msg.def.id);
        if (idx >= 0) saved[idx] = msg.def;
        else saved.push(msg.def);
        persist(saved);

        const nodes = collectTextNodes(figma.currentPage.selection);
        if (nodes.length === 0) {
          figma.ui.postMessage({
            type: 'applied',
            saved,
            message: '定義を保存しました（適用するにはテキストを選択してください）'
          });
          break;
        }
        for (const node of nodes) {
          await applyCompositeToNode(node, msg.def);
        }
        figma.ui.postMessage({ type: 'applied', saved, message: `${nodes.length}件のテキストに適用しました` });
        break;
      }

    }
  } catch (err) {
    figma.ui.postMessage({ type: 'error', message: err.message ?? 'エラーが発生しました' });
  }
};
