import { mod, cons, inc, set } from 'shades'
import { createAction } from 'redux-act'
import { actionFactory, batch } from '../src/index'
import {should} from 'chai'
should()

const initialState = {
  counter: 0,
  visible: true,
  posts: [
    {
      name: 'Why is the rum gone?',
      likes: 50,
    },
    {
      name: 'To tortuga!',
      likes: 200,
    }
  ],
}

const makeUpdate = actionFactory => action =>
  actionFactory.$reducer(actionFactory.__extra.initialState, action)


describe('actionFactory', () => {
  let dataActions, updater
  
  beforeEach(() => {
    dataActions = actionFactory('data', initialState)
    updater = makeUpdate(dataActions)
  })

  it('should generate templated actions from initialState', () => {
    dataActions.setCounter.should.be.a('function')
    dataActions.setPosts.should.be.a('function')
  })

  it('should respond to generated templated actions', () => {
    updater(dataActions.setCounter(10)).counter.should.be.equal(10)
  })

  it('should create default actions', () => {
    dataActions.reset.should.be.a('function')
    dataActions.setter.should.be.a('function')
    dataActions.toggle.should.be.a('function')
    dataActions.constant.should.be.a('function')
  })

  it('should respond to default actions', () => {
    dataActions.reset.should.be.a('function')
    updater(dataActions.setter('counter')(10)).counter.should.be.equal(10)
    updater(dataActions.toggle('visible')()).visible.should.be.false
    dataActions.constant.should.be.a('function')
  })

  it('should allow the registration of custom actions', () => {
    const first = arr => arr[0]
    const last = arr => arr[arr.length - 1]
    const title = 'Hello, World!'

    dataActions.$register('addPost')
    (createAction('adds a post to the user'))
    (name => mod('posts')(cons({name, likes: 0})))

    last(updater(dataActions.addPost(title)).posts).name.should.equal(title)

    dataActions.$register('like')
    (createAction('adds a like to a post'))
    (idx => mod(`posts[${idx}].likes`)(inc))

    first(updater(dataActions.like(0)).posts).likes.should.equal(initialState.posts[0].likes + 1)

  })

  it('should allow registration of constant actions', () => {
    dataActions.$registerConstant('setInvisible')
    (createAction('invisible'))
    (set('visible')(false))

    updater(dataActions.setInvisible()).visible.should.be.false
  })

  it('should allow $add-ing aliases', () => {
    dataActions.$add('toggleVisible')
    (dataActions.toggle('visible'))

    updater(dataActions.toggleVisible()).visible.should.be.false

    dataActions.$add('setCounterTo5')
    (() => dataActions.setter('counter')(5))

    updater(dataActions.setCounterTo5()).counter.should.equal(5)
  })

  it('should allow batching', () => {
    dataActions.$add('hideAll')
    (() => batch(
      dataActions.setPosts([]),
      dataActions.setVisible(false),
    ))

    const hidden = updater(dataActions.hideAll())
    hidden.posts.should.deep.equal([])
    hidden.visible.should.be.false
  })
})
