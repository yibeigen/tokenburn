import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');
const snapshotFile = path.join(dataDir, 'snapshot.json');
const backupFile = path.join(dataDir, 'snapshot.bak.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 检查是否存在已落盘的历史快照
 */
export function hasSnapshot() {
  return fs.existsSync(snapshotFile);
}

/**
 * 读取已保存的本地历史快照 (带原子容灾保护)
 */
export function loadSnapshot() {
  if (!fs.existsSync(snapshotFile)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(snapshotFile, 'utf8');
    const data = JSON.parse(raw);
    if (data && data.overview && data.toolStats) {
      return {
        ...data,
        meta: {
          ...data.meta,
          fromCache: true,
          snapshotTime: data.meta?.snapshotTime || data.meta?.scanTime || new Date().toISOString()
        }
      };
    }
  } catch (e) {
    console.error('[Storage] 主快照解析失败，尝试从备份快照恢复:', e.message);
    if (fs.existsSync(backupFile)) {
      try {
        const rawBak = fs.readFileSync(backupFile, 'utf8');
        const dataBak = JSON.parse(rawBak);
        return {
          ...dataBak,
          meta: {
            ...dataBak.meta,
            fromCache: true,
            recoveredFromBackup: true
          }
        };
      } catch (be) {
        console.error('[Storage] 备份快照亦无法读取:', be.message);
      }
    }
  }

  return null;
}

/**
 * 原子安全写入快照数据 (Atomic Write via Temp File + Rename)
 * 绝对不会因中途断电、崩溃导致 JSON 文件损坏
 */
export function saveSnapshot(data) {
  ensureDataDir();

  const enrichedData = {
    ...data,
    meta: {
      ...data.meta,
      snapshotTime: new Date().toISOString(),
      isSaved: true
    }
  };

  const jsonStr = JSON.stringify(enrichedData, null, 2);
  const tempFile = path.join(dataDir, `snapshot.json.tmp.${Date.now()}`);

  try {
    // 1. 如果已有旧快照，先建立备份
    if (fs.existsSync(snapshotFile)) {
      try {
        fs.copyFileSync(snapshotFile, backupFile);
      } catch (ce) {}
    }

    // 2. 写入临时文件
    fs.writeFileSync(tempFile, jsonStr, 'utf8');

    // 3. 原子重命名覆盖 (跨平台安全操作)
    fs.renameSync(tempFile, snapshotFile);

    console.log(`[Storage] 历史战绩快照已安全落盘: ${snapshotFile} (${(Buffer.byteLength(jsonStr) / 1024).toFixed(1)} KB)`);
    return enrichedData;
  } catch (e) {
    console.error('[Storage] 保存快照失败:', e.message);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (ue) {}
    }
    throw e;
  }
}
