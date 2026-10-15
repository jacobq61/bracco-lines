// FeedPublisher adapter: writes the feed to a file atomically, so a page never reads a half-written file.
import {mkdir, rename, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

export function createFilePublisher(path) {
  return {
    async publish(feed) {
      await mkdir(dirname(path), {recursive: true});
      const tmp = `${path}.tmp-${process.pid}`;
      await writeFile(tmp, JSON.stringify(feed));
      await rename(tmp, path);
      return path;
    },
  };
}
