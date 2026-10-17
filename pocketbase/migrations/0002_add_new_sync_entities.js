/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const syncRecords = app.findCollectionByNameOrId('sync_records')
    const entityField = syncRecords.fields.getByName('entity')
    if (entityField) {
      const currentValues = entityField.values || []
      const newEntities = ['idea', 'activityPlan', 'activityLog', 'moduleDay', 'medal']
      for (const val of newEntities) {
        if (!currentValues.includes(val)) {
          currentValues.push(val)
        }
      }
      entityField.values = currentValues
      app.save(syncRecords)
    }
  },
  (app) => {
    try {
      const syncRecords = app.findCollectionByNameOrId('sync_records')
      const entityField = syncRecords.fields.getByName('entity')
      if (entityField && entityField.values) {
        const toRemove = new Set(['idea', 'activityPlan', 'activityLog', 'moduleDay', 'medal'])
        entityField.values = entityField.values.filter((v) => !toRemove.has(v))
        app.save(syncRecords)
      }
    } catch (_) {}
  },
)
