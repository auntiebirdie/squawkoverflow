const Database = require('../helpers/database.js');

class Members {
  constructor() {
    this.model = require('../models/member.js');
  }

  all(query) {
    return new Promise((resolve, reject) => {
      let filters = {
        'lastActivityAt': {
          'comparator': '>',
          'value_trusted': 'DATE_SUB(NOW(), INTERVAL 6 MONTH)'
        }
      };

      if (query.privacy) {
        if (!Array.isArray(query.privacy)) {
          query.privacy = [query.privacy];
        }

        filters['id'] = {
          'comparator': 'NOT IN',
          'value_trusted': '(SELECT `member` FROM member_settings WHERE `member` = members.id AND `setting` IN ("' + query.privacy.map((setting) => `privacy_${setting}`).join('","') + '") AND `value` = 1)'
        };
      }

      Database.get('members', filters, {
        'select': ['id'],
        'order': 'username'
      }).then((results) => {
        Promise.all(results.map((result) => this.get(result.id))).then((results) => {
          resolve(results);
        });
      });
    });
  }

  get(id) {
    let Member = new this.model(id);

    return Member.fetch();
  }
}

module.exports = new Members;
