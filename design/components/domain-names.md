# Domain names

Hosts aren't checked against the syntax of DNS names, or of
internationalized domain names, for any scheme. The one exception is a
label that starts with `xn--` in an `http` or `https` host, which has to
be an A-label, the ASCII form of an internationalized domain name.
`normalizeIri` converts those labels to Unicode, and `normalizeUri`
leaves them as they are.

```js
isIri("http://xn--caf-dma.example/"); // true
isIri("http://xn--abc.example/"); // false: xn--abc isn't an A-label
isIri("http://café.example/"); // true: a Unicode label isn't checked
normalizeIri("http://XN--CAF-DMA.example/"); // "http://café.example/"
normalizeUri("http://XN--CAF-DMA.example/"); // "http://xn--caf-dma.example/"
```

This was decided on 2026-11-09. Before, no label was checked and none
was converted (see [Rejected](#rejected)).

## Why hosts aren't checked

It isn't a MUST-level rule:

- RFC 3986 §3.2.2 "does not restrict the syntax of reg-name beyond what
  is necessary for interoperability". It leaves that to the resolver,
  which "might use DNS, host tables, yellow pages, NetInfo, WINS, or any
  other system". DNS syntax is a SHOULD for whoever writes the URI: "URI
  producers should use names that conform to the DNS syntax".
- RFC 9110 doesn't add a rule. A registered name in an `http` URI is "an
  indirect identifier for use with a name resolution service, such as
  DNS". So `http://my_host/` is a valid `http` URI.
- RFC 3987 §5.3.3 says internationalized domain names "SHOULD be
  validated by using the ToASCII operation" of RFC 3490. That's IDNA2003,
  which IDNA2008 (RFC 5891) replaced, and browsers use UTS #46. They
  disagree about some names, so which one is right isn't known either.

Checking DNS syntax is a policy, like rejecting `userinfo` in an `http`
URI. It's also about hosts, not one scheme: every scheme whose host is
meant for DNS would need it. A caller who wants it checks the host after
parsing, with whichever IDNA library they choose:

```js
assertIri(value);
const { host } = parseIri(value);
if (host !== undefined && !isDomainName(host)) {
  ...
}
```

## A-labels

The goal is that converting between a URL and an IRI loses nothing. A
URL's host is always ASCII, since the URL Standard converts it with UTS
#46's ToASCII, and `urlToIri` keeps it (see [URLs](urls.md)). Without a
conversion back, `urlToIri` of a URL for `https://café.example/` and the
IRI `https://café.example/` normalize to different strings, though
they're the same identifier. With it, `normalizeIri` makes them equal,
and `new URL` of the result has the URL's host again.

RFC 3987 allows the conversion, for a scheme that's known to use domain
names. §3.2 says an implementation with knowledge of the scheme "MAY"
convert an A-label to Unicode with ToUnicode, and §5.3.3 says
scheme-based normalization "may" treat the two forms as equivalent.

`http` and `https` are those schemes. Their hosts are meant for DNS, even
though RFC 9110 doesn't require it. Other schemes, `file` included, can
have `xn--` in a host that means something else, so they aren't
converted.

### Checking

A label that starts with `xn--` says it's an A-label. RFC 5890 §2.3.1
calls one that isn't a "Fake A-label": "Some strings that are prefixed
with "xn--" to form labels may not be the output of the Punycode
algorithm, may fail the other tests outlined below, or may violate
other IDNA restrictions and thus are also not valid IDNA labels."

A fake A-label has no Unicode form, so `normalizeIri` couldn't convert
it. So it's invalid in an `http` or `https` host, and every `Iri` that
`normalizeIri` gets has only A-labels. This isn't a MUST of RFC 9110, as
a built-in's rules otherwise are (see
[Schemes](schemes.md#built-in-schemes)). It's what the conversion needs,
and the IDNA RFCs agree that a fake A-label isn't an internationalized
domain name. RFC 5891 §3.2 says one in a DNS query "MUST" be an A-label,
and RFC 3987 §5.3.3 says "An IRI containing an invalid IDN cannot
successfully be resolved."

The check is RFC 5891 §5.3's, for a lookup that converts a label to
Unicode: "the label MUST be rejected if the resulting label is not
identical to the original". A label is an A-label when:

1. its lowercase form, after `xn--`, decodes with Punycode (RFC 3492),
   and
2. the runtime's URL host parser, which applies UTS #46, turns the
   decoded label, lowercased, back into the same label.

The decoder is in `src/punycode.js`, about 80 lines, with no tables. The
round trip is `URL.parse`, so the IDNA tables are the runtime's. The
library supports every version of Node.js that's still maintained. The
oldest is 22, which has `URL.parse` since 22.1, and so do browsers since
2024. `engines` in `package.json` says so.

- **Lowercase.** RFC 5891 §5.3 makes an A-label lowercase before
  converting it, and normalizing makes the host lowercase. The decoded label is
  lowercased too, because that's what normalizing makes. UTS #46 maps
  some letters to uppercase, like Cherokee's, so `xn--t9d` is `Ꮇ`, and
  `normalizeIri` makes it `ꮇ`. The round trip checks that `ꮇ` is the
  same label.
- **One A-label for each name.** A label that decodes to ASCII, like
  `xn--wq-`, isn't one, and neither is a second spelling of a name, like
  `xn---stnnm` for `xn--stnnm`. The URL Standard accepts both, so
  `urlToIri` throws for a URL with one (see
  [URLs](urls.md#checking-the-result)).
- **Unicode labels aren't checked.** That would be the IDNA check of
  [Why hosts aren't checked](#why-hosts-arent-checked), and isn't needed
  to convert anything.
- **IP literals are skipped.** An IP literal of a future version can have
  `xn--`, like `[v7.xn--abc]`, but it isn't a domain name.
- **A percent-encoded label isn't decoded first.** `xn--%63af-dma` doesn't
  decode, so it's invalid, though `%63` is `c`.
  Normalizing doesn't decode a host's percent-encoding either.

The answer depends on the runtime: one with an older Unicode version can
reject a label that a newer one accepts. A label that's accepted always
converts to a name that the same runtime turns back into the same host,
so a normalized IRI never names a different host than its input did.

### How it's checked

A built-in's rule for a component can have a check, for what a pattern
can't say. It's a function of the component, with a hint, a function of
the whole value that says whether the check could fail. `http`'s hint
finds `xn--` anywhere, in any case. The value is only split when the hint
matches, so an `http` URI without `xn--` costs a scan for `--`, which is
rare in URLs. `is*`, `assert*`, and `resolveIri` run the check after the
scheme's pattern passes, and a failing check is a `component-mismatch`
of the host (see [Errors](errors.md#reasons)), with the message `an http
URI's host must be an internationalized domain name in a label that
starts with xn--, like xn--caf-dma`.

That's a predicate, which the design rejected for rules in general,
because each one scanned every identifier again (see
[Schemes](schemes.md#rejected-1)). With the hint, `isIri` takes 7% longer
for an `http` URI without `xn--`, and an `xn--` label takes about 1.4
microseconds to check, most of it `URL.parse` (see
[A-labels](../benchmarks/a-labels.md)).

### Converting

`normalizeIri` decodes every `xn--` label of an `http` or `https` host
and makes it lowercase, after the syntax-based normalization has made
the host lowercase. It trusts that they're A-labels, since its input is an `Iri`,
so it doesn't call `URL.parse`. A scheme's host normalization is told
whether it's normalizing a URI or an IRI, since `normalizeUri`'s result
has to stay ASCII.

## Rejected

- **Leaving a fake A-label as it is**, and converting only the labels
  that pass the round trip, in `normalizeIri`. It was the first version
  tried. Validation said `http://xn--abc.example/` was valid, though it
  can't be resolved, and `normalizeIri` needed `URL.parse` on every call
  with `xn--`: 1.8 microseconds a call, where decoding a checked label
  takes 0.8.
- **Decoding without the round trip.** A fake A-label decodes to a
  string that the URL parser turns into a different host, so the
  normalized IRI would name a different resource.
- **Node's `url.domainToUnicode`.** It's UTS #46's ToUnicode, with the
  tables Node.js already has, but it's only in Node.js. It's also
  lenient: it converts `xn--wq-` to `wq` and `xn---stnnm` to `䅧䅫䅠`,
  which change the host.
- **Node's `punycode` module**, which is deprecated (DEP0040).
- **`new URL` in a `try`** for the round trip. A label that fails throws,
  which took 3.7 microseconds, where `URL.parse` returns `null` in 0.5.
- **A hint that's a regular expression**, `/^[^:]*:\/\/[^/?#]*xn--/i`,
  which only matches `xn--` in the authority. It made `isIri` of an
  `http` URI 20% slower. The `indexOf` scan is 7%, and an `xn--` in a
  path, which only costs a split, is rare.
- **Normalizing for every scheme**, through the URI and IRI forms'
  normalization of the host. A host of a scheme that isn't known to use
  domain names can have `xn--` that isn't Punycode.
- **A domain-name check built in, off by default.** The ASCII syntax is
  one pattern, but internationalized domain names need IDNA tables,
  which are much larger than the library, and a choice between three
  standards that disagree.
- **An option with a function that checks hosts**, like
  `isRegName: (host) => boolean`, for every scheme. It puts behavior in
  every call for a policy that the caller can apply to the parsed host
  without any option.
- **Normalizing internationalized domain names without a check**, which
  this design rejected until 2026-11-09, because it "needs the same IDNA
  tables". The runtime's URL parser has them, and the decoder doesn't
  need any.

## Known limitations

- **Unicode labels are only made lowercase.** UTS #46 maps a label with
  NFC and case folding, and `normalizeIri` only calls `toLowerCase`. So two Unicode spellings of the same name can
  normalize to different strings. An A-label always converts to the form
  UTS #46 makes, lowercased, so a URL's host and an IRI written that way
  are equal.
- **`ws` and `wss` aren't built in**, so their hosts aren't checked or
  converted.
