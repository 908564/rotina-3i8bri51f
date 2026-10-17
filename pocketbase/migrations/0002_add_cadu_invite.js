migrate(
  (app) => {
    const invites = app.findCollectionByNameOrId('invites')
    const email = 'cadu.mendes1140@gmail.com'

    const existing = app.findRecordsByFilter('invites', `email = '${email}'`, '', 1, 0)
    if (existing.length === 0) {
      const record = new Record(invites)
      record.set('email', email)
      app.save(record)
    }
  },
  (app) => {
    const existing = app.findRecordsByFilter(
      'invites',
      "email = 'cadu.mendes1140@gmail.com'",
      '',
      1,
      0,
    )
    if (existing.length > 0) {
      app.delete(existing[0])
    }
  },
)
