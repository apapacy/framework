import test from 'ava';
import {
  Document,
  Schema,
  Field
} from '../dist';

test('field value should be converted to the specified type', (t) => {
  let bookSchema = new Schema({
    fields: () => ({
      title: {
        type: 'String'
      },
      year: {
        type: 'Integer'
      },
      book: {
        type: bookSchema
      }
    })
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      age: {
        type: 'Integer'
      },
      enabled: {
        type: 'Boolean'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      },
      tags: {
        type: ['String']
      },
      keywords: {
        type: []
      }
    }
  });
  let data = {
    name: 100,
    age: '35',
    enabled: 'true',
    book: {
      title: 100,
      book: {
        title: 200
      }
    },
    books: [
      {
        title: 100
      }
    ],
    tags: ['foo', 'bar', 100, null],
    keywords: ['foo', 'bar', 100, null]
  };
  let user = new Document(data, userSchema);

  t.is(user.name, '100');
  t.is(user.age, 35);
  t.is(user.enabled, true);
  t.is(user.book.title, '100');
  t.is(user.book.year, null);
  t.is(user.book.book.title, '200');
  t.is(user.books[0].title, '100');
  t.is(user.books[0].year, null);
  t.deepEqual(user.tags, ['foo', 'bar', '100', null]);
  t.deepEqual(user.keywords, ['foo', 'bar', 100, null]);
});

test('field can be of a custom type', (t) => {
  let schema = new Schema({
    fields: {
      name: {
        type: 'cool'
      }
    },
    types: {
      cool: (v) => `${v}-cool`
    }
  });
  let data = {
    name: 100
  };
  let user = new Document(data, schema);

  t.is(user.name, '100-cool');
});

test('field can have a default value', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: () => 100
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue () { return this instanceof Field ? 'yes' : 'no' } // Field context
      },
      age: {
        type: 'Integer',
        defaultValue: '35'
      },
      enabled: {
        type: 'Boolean',
        defaultValue: () => true
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      },
      papers: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Foo'
          }
        ]
      }
    }
  });
  let data = {
    books: [
      null,
      {
        title: 100
      }
    ]
  };
  let user0 = new Document(null, userSchema);
  let user1 = new Document(data, userSchema);
  let book0 = new Document(null, bookSchema);
  let book1 = new Document(data.books[1], bookSchema);

  t.is(user0.name, 'yes');
  t.is(user0.$name.defaultValue, 'yes');
  t.is(user0.age, 35);
  t.is(user0.enabled, true);
  t.is(user0.book, null);

  t.deepEqual(user0.papers[0].title, 'Foo');
  t.deepEqual(user1.books, [null, book1]);
  t.is(user1.books[0], null);
  t.is(user1.books[1].title, '100');
});

test('field can have a fake value', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        fakeValue: () => 100
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        fakeValue () { return this instanceof Field ? 'yes' : 'no' } // Field context
      },
      age: {
        type: 'Integer',
        defaultValue: '35'
      },
      enabled: {
        type: 'Boolean',
        fakeValue: () => true
      },
      papers: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Foo'
          }
        ]
      }
    }
  });
  let user0 = new Document(null, userSchema);
  let user1 = new Document(null, userSchema);

  t.is(user0.$name.fakeValue, 'yes');
  t.is(user0.$age.fakeValue, null);
  t.is(user0.$enabled.fakeValue, true);

  t.is(user0.$name.value, null);
  user0.$name.fake();
  t.is(user0.$name.value, 'yes');

  user0.$age.clear();
  t.is(user0.$age.value, null);
  user0.$age.fake();
  t.is(user0.$age.value, 35);

  user0.$papers.clear();
  t.is(user0.papers, null);
  user0.$papers.fake();
  t.is(user0.papers.length, 1);

  t.is(user1.$name.value, null);
  user1.fake();
  t.is(user1.$name.value, 'yes');
});

test('field can be transformed through custom setter and getter', (t) => {
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue: 100,
        get: (value) => `${value}-get`,
        set: (value) => `${value}-set`
      }
    }
  });
  let user = new Document(null, userSchema);

  t.is(user.name, '100-set-get');
});

test('method `populate` should not set custom fields when schema strict=true', (t) => {
  let userSchema = new Schema({
    strict: true,
    fields: {
      name: {
        type: 'String'
      }
    }
  });
  let data = {
    name: 'John',
    age: 35.5
  };
  let user = new Document(null, userSchema);
  user.populate(data);

  t.is(user.name, 'John');
  t.is(user.age, undefined);
});

test('method `populate` should set custom fields when schema strict=false', (t) => {
  let userSchema = new Schema({
    strict: false,
    fields: {
      name: {
        type: 'String',
        defaultValue: 100
      }
    }
  });
  let data = {
    name: 'John',
    age: 35.5
  };
  let user = new Document(null, userSchema);
  user.populate(data);

  t.is(user.name, 'John');
  t.is(user.age, 35.5);
});

test('variable `$parent` should return the parent document', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    book: {
      title: null
    },
    books: [
      {
        title: null
      }
    ]
  };
  let user = new Document(data, userSchema);

  t.is(user.$parent, null);
  t.is(user.book.$parent, user);
  t.is(user.books[0].$parent, user);
});

test('variable `$root` should return the first document in a tree of nested documents', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    book: {
      title: null
    },
    books: [
      {
        title: null
      }
    ]
  };
  let user = new Document(data, userSchema);

  t.is(user.$root, user);
  t.is(user.book.$root, user);
  t.is(user.books[0].$root, user);
});

test('method `getPath` should return an instance of a field at path', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    name: 'Foo',
    book: {
      title: 'Bar'
    },
    books: [
      {
        title: 'Baz'
      }
    ]
  };
  let user0 = new Document(null, userSchema);
  let user1 = new Document(data, userSchema);

  t.is(user0.getPath('name'), null);
  t.is(user1.getPath('name'), 'Foo');
  t.is(user1.getPath('$name').value, 'Foo');
  t.is(user0.getPath('book', 'title'), undefined);
  t.is(user1.getPath('book', 'title'), 'Bar');
  t.is(user0.getPath('books', 0, 'title'), undefined);
  t.is(user1.getPath('books', 0, '$title').value, 'Baz');
});

test('method `hasPath` should check field existance at path', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    name: 100,
    book: {
      title: 100
    },
    books: [
      {
        title: 100
      }
    ]
  };
  let user0 = new Document(null, userSchema);
  let user1 = new Document(data, userSchema);

  t.is(user0.hasPath('name'), true);
  t.is(user0.hasPath('book', 'title'), false);
  t.is(user0.hasPath('books', 0, 'title'), false);
  t.is(user0.hasPath(['books', 0, 'title']), false);
  t.is(user1.hasPath('name'), true);
  t.is(user1.hasPath('book', 'title'), true);
  t.is(user1.hasPath('books', 0, 'title'), true);
  t.is(user1.hasPath(['books', 0, 'title']), true);
});

test('method `flatten` should return an array of fields', async (t) => {
  let styleSchema = new Schema({
    fields: {
      kind: {
        type: 'String'
      }
    }
  });
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      },
      style: {
        type: styleSchema
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      newBook: {
        type: bookSchema
      },
      newBooks: {
        type: [bookSchema]
      },
      oldBook: {
        type: bookSchema
      },
      oldBooks: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    name: 'John Smith',
    newBook: {
      title: 100,
      style: {
        kind: 'foo'
      }
    },
    newBooks: [
      null,
      {
        title: 100,
        style: {
          kind: 'foo'
        }
      }
    ],
    oldBook: null,
    oldBooks: []
  };
  let user = new Document(data, userSchema);

  t.deepEqual(user.flatten().map((f) => f.path), [
    ['name'],
    ['newBook'],
    ['newBook', 'title'],
    ['newBook', 'style'],
    ['newBook', 'style', 'kind'],
    ['newBooks'],
    ['newBooks', 1, 'title'],
    ['newBooks', 1, 'style'],
    ['newBooks', 1, 'style', 'kind'],
    ['oldBook'],
    ['oldBooks']
  ]);
});

test('method `serialize` should convert a document into serialized data object', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: 100
      },
      year: {
        type: 'Integer'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      age: {
        type: 'float'
      },
      enabled: {
        type: 'Boolean'
      },
      newBook: {
        type: bookSchema
      },
      newBooks: {
        type: [bookSchema]
      },
      oldBook: {
        type: bookSchema
      },
      oldBooks: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    name: 'John Smith',
    newBook: {
      title: 100
    },
    newBooks: [
      null,
      {
        title: 100
      }
    ]
  };
  let user = new Document(data, userSchema);

  t.deepEqual(user.serialize(), {
    name: 'John Smith',
    age: null,
    enabled: null,
    newBook: {
      title: '100',
      year: null
    },
    newBooks: [
      null,
      {
        title: '100',
        year: null
      }
    ],
    oldBook: null,
    oldBooks: null
  });
});

test('method `reset` should deeply set fields to their default values and invalidate the errors', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: 'Foo'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue: 'Bar'
      },
      book: {
        type: bookSchema,
        defaultValue: {
          title: 'Baz'
        }
      },
      books: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Qux'
          }
        ]
      }
    }
  });
  let data = {
    name: 100,
    book: {
      title: 'Quux'
    },
    books: [
      {
        title: 'Corge'
      },
      {
        title: 'Grault'
      }
    ]
  };
  let user = new Document(null, userSchema);
  user.populate(data);
  user.$name._errors = ['foo'];

  user.reset();

  t.deepEqual(user.$name.errors, []);
  t.deepEqual(user.serialize(), {
    name: 'Bar',
    book: {
      title: 'Baz'
    },
    books: [
      {
        title: 'Qux'
      }
    ]
  });
});

test('method `clear` should deeply clear fields', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: 'Foo'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue: 'Bar'
      },
      book: {
        type: bookSchema,
        defaultValue: {
          title: 'Baz'
        }
      },
      books: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Qux'
          }
        ]
      }
    }
  });
  let user = new Document(null, userSchema);
  user.clear();

  t.deepEqual(user.serialize(), {
    name: null,
    book: null,
    books: null
  });
});

test('method `clear` should deeply clear fields', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: 'Foo'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue: 'Bar'
      },
      book: {
        type: bookSchema,
        defaultValue: {
          title: 'Baz'
        }
      },
      books: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Qux'
          }
        ]
      }
    }
  });
  let user = new Document(null, userSchema);
  user.clear();

  t.deepEqual(user.serialize(), {
    name: null,
    book: null,
    books: null
  });
});

test('method `commit` should deeply reset information about changed fields.', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: 'Foo'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue: 'Bar'
      },
      book: {
        type: bookSchema,
        defaultValue: {
          title: 'Baz'
        }
      },
      books: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Qux'
          }
        ]
      }
    }
  });
  let data = {
    name: 100,
    book: {
      title: 'Quux'
    },
    books: [
      {
        title: 'Corge'
      },
      {
        title: 'Grault'
      }
    ]
  };
  let user = new Document(data, userSchema);

  t.is(user.$name.initialValue, 'Bar');
  user.commit();
  t.is(user.$name.initialValue, '100');
  t.is(user.book.$title.initialValue, 'Quux');
  t.is(user.books[0].$title.initialValue, 'Corge');
  t.is(user.books[1].$title.initialValue, 'Grault');
});

test('method `rollback` should deeply reset fields to their initial values', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        defaultValue: 'Bar'
      },
      book: {
        type: bookSchema,
        defaultValue: {
          title: 'Baz'
        }
      },
      books: {
        type: [bookSchema],
        defaultValue: [
          {
            title: 'Qux'
          }
        ]
      }
    }
  });
  let data = {
    name: 100,
    book: {
      title: 'Quux'
    },
    books: [
      {
        title: 'Corge'
      },
      {
        title: 'Grault'
      }
    ]
  };
  let user = new Document(null, userSchema);
  user.populate(data);
  user.rollback();

  t.deepEqual(user.serialize(), {
    name: 'Bar',
    book: {
      title: 'Baz'
    },
    books: [
      {
        title: 'Qux'
      }
    ]
  });
});

test('method `isChanged` should return `true` if at least one field has been changed', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  });

  let user = new Document(null, userSchema);
  t.is(user.isChanged(), false);
  user.name = 'Foo';
  t.is(user.$name.isChanged(), true);
  t.is(user.isChanged(), true);
  user.commit();
  user.book = {title: 'Foo'};
  t.is(user.$book.isChanged(), true);
  t.is(user.book.isChanged(), true);
  t.is(user.isChanged(), true);
  user.commit();
  user.book.title = {title: 'Bar'};
  t.is(user.book.$title.isChanged(), true);
  t.is(user.isChanged(), true);
  user.commit();
  user.books = [{title: 'Foo'}];
  t.is(user.$books.isChanged(), true);
  t.is(user.isChanged(), true);
  user.commit();
  user.books[0].title = [{title: 'Bar'}];
  t.is(user.books[0].$title.isChanged(), true);
  t.is(user.isChanged(), true);
});

test('method `isNested` should return `true` if nested fields exist', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let schema0 = new Schema({
    fields: {
      name: {
        type: 'String'
      }
    }
  });
  let schema1 = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      }
    }
  });
  let schema2 = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      books: {
        type: [bookSchema]
      }
    }
  });

  let doc0 = new Document(null, schema0);
  let doc1 = new Document(null, schema1);
  let doc2 = new Document(null, schema2);

  t.is(doc0.isNested(), false);
  t.is(doc1.isNested(), true);
  t.is(doc2.isNested(), true);
});

test('method `equals` should return `true` when the passing object looks the same', (t) => {
  let authorSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      }
    }
  });
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      },
      author: {
        type: authorSchema
      }
    }
  });
  let userSchema = {
    fields: {
      name: {
        type: 'String',
        defaultValue: 'John'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  };
  let data0 = {
    name: null,
    book: {
      title: 'Foo',
      author: {
        name: 'Bar'
      }
    },
    books: [
      {
        title: 'Bar'
      }
    ]
  };
  let data1 = {
    name: 'Mandy'
  };
  let user0 = new Document(null, new Schema(userSchema));
  let user1 = new Document(null, new Schema(userSchema));
  let user2 = new Document(data0, new Schema(userSchema));
  let user3 = new Document(data1, new Schema(userSchema));

  t.is(user0.equals(user1), true);
  t.is(user0.equals(user2), false);
  t.is(user0.equals(user3), false);
  t.is(user2.equals(user3), false);
  t.is(user0.$name.equals('John'), true);
  t.is(user2.$book.equals({
    title: 'Foo',
    author: {
      name: 'Bar'
    }
  }), true);
  t.is(user2.$books.equals([
    {
      title: 'Bar',
      author: null
    }
  ]), true);
});

test('method `clone` should return an exact copy of the original', (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        defaultValue: 100
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      book: {
        type: bookSchema
      },
      books: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    name: 'John Smith',
    books: [
      null,
      {
        title: 100
      }
    ]
  };

  let user = new Document(data, userSchema);

  t.is(user.clone() === user, false);
  t.deepEqual(user.clone(), user);
});

test('method `validate` should validate all fields and throw an error', async (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      year: {
        type: 'Integer'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      oldBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      oldBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'},
          {validator: 'arrayLength', message: 'is too short', min: 10}
        ]
      },
      prevBooks: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    oldBook: {},
    oldBooks: [null, {}]
  };
  let user = new Document(data, userSchema);
  let validatorError0 = {validator: 'presence', message: 'is required', code: 422};
  let validatorError1 = {validator: 'arrayLength', message: 'is too short', code: 422};

  // throws an error
  t.throws(user.validate());
  let error = null;
  try {
    await user.validate();
  } catch (e) {
    error = e;
  }
  t.is(error.code, 422);
  t.deepEqual(error.paths, [
    ['name'],
    ['newBook'],
    ['newBooks'],
    ['oldBook', 'title'],
    ['oldBooks'],
    ['oldBooks', 1, 'title']
  ]);
  // errors are populated
  t.deepEqual(user.$name.errors[0], validatorError0);
  t.deepEqual(user.$newBook.errors[0], validatorError0);
  t.deepEqual(user.$newBooks.errors[0], validatorError0);
  t.deepEqual(user.$oldBook.errors.length, 0);
  t.deepEqual(user.oldBook.$title.errors[0], validatorError0);
  t.deepEqual(user.oldBook.$year.errors.length, 0);
  t.deepEqual(user.$oldBooks.errors[0], validatorError1);
  t.deepEqual(user.oldBooks[0], null);
  t.deepEqual(user.oldBooks[1].$title.errors[0], validatorError0);
  t.deepEqual(user.oldBooks[1].$year.errors.length, 0);
  t.deepEqual(user.$prevBooks.errors.length, 0);
});

test('methods `isValid` and `hasErrors` should tell if fields are valid', async (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      oldBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      oldBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      }
    }
  });

  let data = {
    name: 'Foo',
    newBook: {
      title: 'Bar'
    },
    newBooks: [
      null,
      {
        title: 'Baz'
      }
    ],
    oldBook: {},
    oldBooks: [null, {}]
  };
  let user = new Document(data, userSchema);
  await user.validate({quiet: true});

  t.is(user.$name.isValid(), true);
  t.is(user.$name.hasErrors(), false);
  t.is(user.$newBook.isValid(), true);
  t.is(user.newBook.$title.isValid(), true);
  t.is(user.newBook.$title.hasErrors(), false);
  t.is(user.$newBooks.hasErrors(), false);
  t.is(user.newBooks[1].$title.hasErrors(), false);
  t.is(user.$oldBook.isValid(), false);
  t.is(user.oldBook.$title.isValid(), false);
  t.is(user.$oldBooks.hasErrors(), true);
  t.is(user.oldBooks[1].$title.hasErrors(), true);
});

test('method `invalidate` should clear errors on all fields', async (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      year: {
        type: 'Integer'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      oldBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      oldBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      prevBooks: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    oldBook: {},
    oldBooks: [null, {}]
  };
  let user = new Document(data, userSchema);

  await user.validate({quiet: true});
  // invalidate is triggered when a field changes
  user.name = 'foo';
  t.deepEqual(user.$name.errors, []);
  // errors are populated
  user.invalidate();
  t.deepEqual(user.$newBook.errors, []);
  t.deepEqual(user.$newBooks.errors, []);
  t.deepEqual(user.oldBook.$title.errors, []);
  t.deepEqual(user.oldBooks[0], null);
  t.deepEqual(user.oldBooks[1].$title.errors, []);
});

test('method `collectErrors` should return an array of field errors', async (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      age: {
        type: 'Integer',
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBook: {
        type: bookSchema,
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      },
      newBooks: {
        type: [bookSchema],
        validate: [
          {validator: 'presence', message: 'is required'}
        ]
      }
    }
  });
  let data = {age: 30};
  let user = new Document(data, userSchema);
  await user.validate({quiet: true});

  t.deepEqual(user.collectErrors(), [
    {
      path: ['name'],
      errors: [
        {validator: 'presence', message: 'is required', code: 422}
      ]
    },
    {
      path: ['newBook'],
      errors: [
        {validator: 'presence', message: 'is required', code: 422}
      ]
    },
    {
      path: ['newBooks'],
      errors: [
        {validator: 'presence', message: 'is required', code: 422}
      ]
    }
  ]);
});

test('method `applyErrors` should set field `errors` property', async (t) => {
  let bookSchema = new Schema({
    fields: {
      title: {
        type: 'String'
      }
    }
  });
  let userSchema = new Schema({
    fields: {
      name: {
        type: 'String'
      },
      newBook: {
        type: bookSchema
      },
      newBooks: {
        type: [bookSchema]
      }
    }
  });
  let data = {
    newBook: {},
    newBooks: [{}, {}]
  };
  let user = new Document(data, userSchema);
  let validatorError = {validator: 'presence', message: 'is required', code: 422};

  user.applyErrors([
    {path: ['name'], errors: [validatorError]},
    {path: ['newBook', 'title'], errors: [validatorError]},
    {path: ['newBooks', 1, 'title'], errors: [validatorError]}
  ]);

  t.deepEqual(user.$name.errors, [validatorError]);
  t.deepEqual(user.newBook.$title.errors, [validatorError]);
  t.deepEqual(user.newBooks[0].$title.errors, []);
  t.deepEqual(user.newBooks[1].$title.errors, [validatorError]);
});
