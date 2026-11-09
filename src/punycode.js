// Punycode (RFC 3492) decoding, for the labels of a host that start with "xn--". Decoding alone doesn't make an
// internationalized domain name: a label that decodes can still be one that IDNA doesn't allow, so validating checks
// it with a round trip, and normalizing only decodes.

const base = 36;
const tMin = 1;
const tMax = 26;
const skew = 38;
const damp = 700;
const initialBias = 72;
const initialN = 128;
const maxCodePoint = 0x10FFFF;

/** @type (delta: number, numPoints: number, firstTime: boolean) => number */
const adapt = (delta, numPoints, firstTime) => {
  delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((base - tMin) * tMax) >> 1) {
    delta = Math.floor(delta / (base - tMin));
    k += base;
  }
  return k + Math.floor((base - tMin + 1) * delta / (delta + skew));
};

// a-z are 0 to 25 and 0-9 are 26 to 35. The input is lowercase, because the host was lowercased first.
/** @type (charCode: number) => number */
const digitOf = (charCode) => {
  if (charCode >= 0x61 && charCode <= 0x7A) {
    return charCode - 0x61;
  } else if (charCode >= 0x30 && charCode <= 0x39) {
    return charCode - 0x30 + 26;
  } else {
    return base;
  }
};

/** @type (input: string) => string | undefined */
export const decodePunycode = (input) => {
  const delimiter = input.lastIndexOf("-");
  /** @type number[] */
  const output = [];
  for (let j = 0; j < Math.max(delimiter, 0); j++) {
    output.push(input.charCodeAt(j));
  }

  let n = initialN;
  let i = 0;
  let bias = initialBias;
  for (let position = delimiter > 0 ? delimiter + 1 : 0; position < input.length;) {
    const oldI = i;
    for (let w = 1, k = base; ; k += base) {
      if (position >= input.length) {
        return undefined;
      }
      const digit = digitOf(input.charCodeAt(position++));
      if (digit >= base) {
        return undefined;
      }
      // A zero digit is skipped so that a w too large for a number (Infinity) can't make NaN
      if (digit > 0) {
        i += digit * w;
        if (i > maxCodePoint * (output.length + 1)) {
          return undefined;
        }
      }
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) {
        break;
      }
      w *= base - t;
    }
    bias = adapt(i - oldI, output.length + 1, oldI === 0);
    n += Math.floor(i / (output.length + 1));
    i %= output.length + 1;
    if (n > maxCodePoint) {
      return undefined;
    }
    // Shifting by hand is faster than splice for a label's few code points
    for (let j = output.length; j > i; j--) {
      output[j] = output[j - 1];
    }
    output[i++] = n;
  }

  return String.fromCodePoint(...output);
};

// A label that starts with "xn--" is an A-label when it decodes and the runtime's URL host parser, which applies
// UTS #46, turns the decoded label, lowercased, back into the same label. The lowercase is what normalizing makes, and
// for letters that UTS #46 maps to uppercase, like Cherokee's, the round trip checks that it's the same label. A
// label that decodes to ASCII, or that has another A-label for the same name, like xn---stnnm for xn--stnnm, isn't
// one.
/** @type (label: string) => boolean */
const isALabel = (label) => {
  const decoded = decodePunycode(label.slice(4));
  return decoded !== undefined && URL.parse(`http://${decoded.toLowerCase()}/`)?.hostname === label;
};

// The end of the label that starts at `start`, which is the next "." or the end of the host
/** @type (host: string, start: number) => number */
const labelEnd = (host, start) => {
  const dot = host.indexOf(".", start);
  return dot === -1 ? host.length : dot;
};

// An IP literal isn't a domain name, though IPvFuture's can have "xn--", like [v7.xn--a]
/** @type (host: string) => boolean */
export const hasValidALabels = (host) => {
  if (host.startsWith("[")) {
    return true;
  }

  for (const label of host.toLowerCase().split(".")) {
    if (label.startsWith("xn--") && !isALabel(label)) {
      return false;
    }
  }
  return true;
};

// The host is a valid one, already lowercased, so every label that starts with "xn--" is an A-label. Only the A-labels
// are replaced, between slices of the host that are kept, which took a third less time than split, map, and join.
/** @type (host: string) => string */
export const hostToUnicode = (host) => {
  if (!host.includes("xn--") || host.startsWith("[")) {
    return host;
  }

  let result = "";
  let kept = 0;
  for (let start = 0; start <= host.length;) {
    const end = labelEnd(host, start);
    if (host.startsWith("xn--", start)) {
      result += host.slice(kept, start) + /** @type string */ (decodePunycode(host.slice(start + 4, end))).toLowerCase();
      kept = end;
    }
    start = end + 1;
  }
  return result + host.slice(kept);
};
