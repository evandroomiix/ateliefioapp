// Contorno para unidades exFAT: readlink em arquivo comum retorna EISDIR,
// enquanto webpack/enhanced-resolve/@vercel/nft esperam EINVAL (comportamento NTFS).
const fs = require("fs");

const toEINVAL = (err, p) => {
  if (err && err.code === "EISDIR") {
    const e = new Error(`EINVAL: invalid argument, readlink '${p}'`);
    e.code = "EINVAL";
    e.errno = -22;
    e.syscall = "readlink";
    e.path = p;
    return e;
  }
  return err;
};

const origSync = fs.readlinkSync;
fs.readlinkSync = function (p, o) {
  try {
    return origSync.call(fs, p, o);
  } catch (err) {
    throw toEINVAL(err, p);
  }
};

const origCb = fs.readlink;
fs.readlink = function (p, o, cb) {
  if (typeof o === "function") {
    cb = o;
    o = undefined;
  }
  return origCb.call(fs, p, o, function (err, res) {
    if (err) return cb(toEINVAL(err, p), res);
    return cb(null, res);
  });
};

if (fs.promises && fs.promises.readlink) {
  const origP = fs.promises.readlink;
  fs.promises.readlink = async function (p, o) {
    try {
      return await origP.call(fs.promises, p, o);
    } catch (err) {
      throw toEINVAL(err, p);
    }
  };
}
