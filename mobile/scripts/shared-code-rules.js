const PLATFORM_FILE = /\.(web|android|ios|native)\.[jt]sx?$/;

const isPlatformFile = (path) => PLATFORM_FILE.test(path);

function measure(files) {
  let sharedLines = 0;
  let platformLines = 0;
  for (const { path, lines } of files) {
    if (isPlatformFile(path)) platformLines += lines;
    else sharedLines += lines;
  }
  const total = sharedLines + platformLines;
  const sharedPct = total === 0 ? 100 : Math.round((sharedLines / total) * 10000) / 100;
  return { sharedLines, platformLines, sharedPct };
}

module.exports = { isPlatformFile, measure };
