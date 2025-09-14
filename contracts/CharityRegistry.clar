(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-NAME u101)
(define-constant ERR-INVALID-DESCRIPTION u102)
(define-constant ERR-INVALID-PROOF-HASH u103)
(define-constant ERR-INVALID-STATUS u104)
(define-constant ERR-CHARITY-ALREADY-EXISTS u105)
(define-constant ERR-CHARITY-NOT-FOUND u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u108)
(define-constant ERR-INVALID-CATEGORY u109)
(define-constant ERR-INVALID-LOCATION u110)
(define-constant ERR-INVALID-CURRENCY u111)
(define-constant ERR-INVALID-MIN-DONATION u112)
(define-constant ERR-INVALID-MAX-GOAL u113)
(define-constant ERR-UPDATE-NOT-ALLOWED u114)
(define-constant ERR-INVALID-UPDATE-PARAM u115)
(define-constant ERR-MAX-CHARITIES-EXCEEDED u116)
(define-constant ERR-INVALID-CHARITY-TYPE u117)
(define-constant ERR-INVALID-CONTACT-INFO u118)
(define-constant ERR-INVALID-REGISTRATION-FEE u119)
(define-constant ERR-INVALID-VERIFICATION-LEVEL u120)

(define-data-var next-charity-id uint u0)
(define-data-var max-charities uint u5000)
(define-data-var registration-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map charities
  uint
  {
    name: (string-utf8 100),
    description: (string-utf8 500),
    proof-hash: (buff 32),
    category: (string-utf8 50),
    location: (string-utf8 100),
    currency: (string-utf8 20),
    min-donation: uint,
    max-goal: uint,
    timestamp: uint,
    creator: principal,
    charity-type: (string-utf8 50),
    contact-info: (string-utf8 200),
    status: bool,
    verification-level: uint
  }
)

(define-map charities-by-name
  (string-utf8 100)
  uint)

(define-map charity-updates
  uint
  {
    update-name: (string-utf8 100),
    update-description: (string-utf8 500),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-charity (id uint))
  (map-get? charities id)
)

(define-read-only (get-charity-updates (id uint))
  (map-get? charity-updates id)
)

(define-read-only (is-charity-registered (name (string-utf8 100)))
  (is-some (map-get? charities-by-name name))
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-NAME))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-proof-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-PROOF-HASH))
)

(define-private (validate-category (cat (string-utf8 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur u"STX") (is-eq cur u"USD") (is-eq cur u"BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-donation (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-DONATION))
)

(define-private (validate-max-goal (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-GOAL))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-charity-type (typ (string-utf8 50)))
  (if (or (is-eq typ u"non-profit") (is-eq typ u"community") (is-eq typ u"environmental"))
      (ok true)
      (err ERR-INVALID-CHARITY-TYPE))
)

(define-private (validate-contact-info (info (string-utf8 200)))
  (if (<= (len info) u200)
      (ok true)
      (err ERR-INVALID-CONTACT-INFO))
)

(define-private (validate-verification-level (level uint))
  (if (<= level u5)
      (ok true)
      (err ERR-INVALID-VERIFICATION-LEVEL))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-charities (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-CHARITIES-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-charities new-max)
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-REGISTRATION-FEE))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (register-charity
  (name (string-utf8 100))
  (description (string-utf8 500))
  (proof-hash (buff 32))
  (category (string-utf8 50))
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-donation uint)
  (max-goal uint)
  (charity-type (string-utf8 50))
  (contact-info (string-utf8 200))
  (verification-level uint)
)
  (let (
        (next-id (var-get next-charity-id))
        (current-max (var-get max-charities))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-CHARITIES-EXCEEDED))
    (try! (validate-name name))
    (try! (validate-description description))
    (try! (validate-proof-hash proof-hash))
    (try! (validate-category category))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-donation min-donation))
    (try! (validate-max-goal max-goal))
    (try! (validate-charity-type charity-type))
    (try! (validate-contact-info contact-info))
    (try! (validate-verification-level verification-level))
    (asserts! (is-none (map-get? charities-by-name name)) (err ERR-CHARITY-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get registration-fee) tx-sender authority-recipient))
    )
    (map-set charities next-id
      {
        name: name,
        description: description,
        proof-hash: proof-hash,
        category: category,
        location: location,
        currency: currency,
        min-donation: min-donation,
        max-goal: max-goal,
        timestamp: block-height,
        creator: tx-sender,
        charity-type: charity-type,
        contact-info: contact-info,
        status: true,
        verification-level: verification-level
      }
    )
    (map-set charities-by-name name next-id)
    (var-set next-charity-id (+ next-id u1))
    (print { event: "charity-registered", id: next-id })
    (ok next-id)
  )
)

(define-public (update-charity
  (charity-id uint)
  (update-name (string-utf8 100))
  (update-description (string-utf8 500))
)
  (let ((charity (map-get? charities charity-id)))
    (match charity
      c
        (begin
          (asserts! (is-eq (get creator c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-description update-description))
          (let ((existing (map-get? charities-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id charity-id) (err ERR-CHARITY-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name c)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete charities-by-name old-name)
                  (map-set charities-by-name update-name charity-id)
                  (ok true)
                )
            )
          )
          (map-set charities charity-id
            (merge c
              {
                name: update-name,
                description: update-description,
                timestamp: block-height
              }
            )
          )
          (map-set charity-updates charity-id
            {
              update-name: update-name,
              update-description: update-description,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "charity-updated", id: charity-id })
          (ok true)
        )
      (err ERR-CHARITY-NOT-FOUND)
    )
  )
)

(define-public (get-charity-count)
  (ok (var-get next-charity-id))
)

(define-public (check-charity-existence (name (string-utf8 100)))
  (ok (is-charity-registered name))
)