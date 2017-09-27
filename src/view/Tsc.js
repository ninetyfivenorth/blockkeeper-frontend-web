import React from 'react'
import {LinearProgress} from 'material-ui/Progress'
import {ArrowBack, Clear, Save, ModeEdit, Launch} from 'material-ui-icons'
import Paper from 'material-ui/Paper'
import Button from 'material-ui/Button'
import Typography from 'material-ui/Typography'
import Table, { TableBody, TableCell, TableRow } from 'material-ui/Table'
import TextField from 'material-ui/TextField'
import {TopBar, Snack, Modal, CoinIcon, ExtLink} from './Lib'
import {theme, themeBgStyle, paperStyle} from './Style'
import Addr from '../logic/Addr'
import __ from '../util'

export default class TscView extends React.Component {
  constructor (props) {
    super(props)
    this.cx = props.cx
    this.state = {edit: false}
    this.addrId = props.match.params.addrId
    this.addrObj = new Addr(this.cx, this.addrId)
    this.tscId = props.match.params.tscId
    this.goBack = props.history.goBack
    this.load = this.load.bind(this)
    this.save = this.save.bind(this)
    this.edit = this.edit.bind(this)
    this.set = this.set.bind(this)
  }

  async componentDidMount () {
    Object.assign(this, __.initView(this, 'tsc'))
    await this.load()
  }

  async load () {
    try {
      const [
        addr,
        {coin0, coin1}
      ] = await Promise.all([
        await this.addrObj.load(),
        this.cx.user.getCoins(this.state.coin)
      ])
      this.addr = addr
      const tsc = await this.addrObj.getTsc(this.tscId, this.addr)
      const blc = this.cx.depot.getTscBlc([tsc], this.addr)
      const tagsJoin = tsc.tags.join(' ')
      this.setState({
        err: null,
        upd: false,
        tsc,
        addr,
        coin0,
        coin1,
        name: tsc.name,
        desc: tsc.desc,
        tagsJoin,
        blc1: `${blc.get(coin0)}`,
        blc2: `${blc.get(coin1)}`
      })
    } catch (e) {
      if (__.cfg('isDev')) throw e
      this.setState({err: e.message})
    }
  }

  edit () {
    this.setState({edit: !this.state.edit})
  }

  set (ilk, val) {
    this.setState({[ilk]: val}, () => {
      let d = {
        upd: false,
        nameEmsg: __.vldAlphNum(this.state.name),
        descEmsg: __.vldAlphNum(this.state.desc, {max: __.cfg('maxHigh')}),
        tagsEmsg: __.vldAlphNum(this.state.tagsJoin, {max: __.cfg('maxHigh')})
      }
      if (!d.nameEmsg && !d.descEmsg && !d.tagsEmsg) d.upd = true
      this.setState(d)
    })
  }

  getTags () {
    if (this.state.tsc.tags) {
      return this.state.tsc.tags.trim().split(' ').map(tag => '#' + tag).join(' ')
    }
  }

  async save () {
    if (this.state.upd === false) {
      return
    }
    this.setState({busy: true})
    const tsc = this.state.tsc
    try {
      const updTsc = {
        hsh: tsc.hsh,
        name: this.state.name,
        desc: this.state.desc,
        tags: this.state.tagsJoin.trim().split(' ')
      }
      this.addr = await this.addrObj.save({tscs: [updTsc]})
      __.addSnack('Transaction updated')
      this.setState({
        tsc: await this.addrObj.getTsc(this.tscId, this.addr),
        snack: __.getSnack(),
        edit: false,
        upd: false,
        busy: false
      })
    } catch (e) {
      if (__.cfg('isDev')) throw e
      this.setState({err: e.message, busy: false})
    }
  }

  render () {
    if (this.state.err) {
      return (
        <Modal onClose={this.goBack}>
          {this.state.err}
        </Modal>
      )
    } else if (this.state.tsc) {
      let modeColor = this.state.mode === 'snd' ? theme.palette.error['500'] : theme.palette.secondary['500']
      let modeSign = this.state.mode === 'snd' ? '-' : '+'
      const tscUrl = __.toSrvUrl('tsc', this.state.addr.coin)(this.state.tsc.hsh)
      return (
        <div style={themeBgStyle}>
          {this.state.snack &&
            <Snack
              msg={this.state.snack}
              onClose={() => this.setState({snack: null})}
            />}
          {this.state.edit &&
            <TopBar
              midTitle='Transaction'
              iconLeft={<Clear />}
              onClickLeft={this.edit}
              icon={<Save />}
              onClick={this.save}
              noUser
            />}
          {!this.state.edit &&
            <TopBar
              midTitle='Transaction'
              iconLeft={<ArrowBack />}
              onClickLeft={this.goBack}
              icon={<ModeEdit />}
              onClick={this.edit}
              noUser
            />}
          {this.state.busy &&
          <LinearProgress />}
          <Paper square style={{...paperStyle, textAlign: 'center'}}>
            <Typography type='headline' style={{color: modeColor}}>
              {modeSign} {this.state.blc1} <CoinIcon coin={this.state.coin0} alt color={modeColor} />
            </Typography>
            <Typography type='body2' style={{color: theme.palette.text.secondary}} gutterBottom>
              {modeSign} {this.state.blc2} <CoinIcon coin={this.state.coin1} color={theme.palette.text.secondary} size={12} alt />
            </Typography>
          </Paper>

          <Paper square style={{...paperStyle}} elevation={5}>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>
                    Name
                  </TableCell>
                  <TableCell numeric>
                    {this.state.edit &&
                    <TextField
                      autoFocus
                      fullWidth
                      placeholder='Name'
                      value={this.state.name}
                      error={Boolean(this.state.nameEmsg)}
                      helperText={this.state.nameEmsg}
                      onChange={evt => this.set('name', evt.target.value)}
                    />}
                    {!this.state.edit &&
                      this.state.tsc.name}
                  </TableCell>
                </TableRow>
                {this.state.tsc.feeDesc &&
                  <TableRow>
                    <TableCell>
                      Additional costs (fee)
                    </TableCell>
                    <TableCell numeric>
                      {this.state.tsc.feeDesc}
                    </TableCell>
                  </TableRow>}
                <TableRow>
                  <TableCell>
                    Tags
                  </TableCell>
                  <TableCell numeric>
                    {this.state.edit &&
                      <TextField
                        placeholder='Tags'
                        fullWidth
                        value={this.state.tagsJoin}
                        error={Boolean(this.state.tagsEmsg)}
                        helperText={this.state.tagsEmsg}
                        onChange={evt => this.set('tagsJoin', evt.target.value)}
                      />}
                    {!this.state.edit &&
                      this.state.tagsJoin}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Notes
                  </TableCell>
                  <TableCell numeric>
                    {this.state.edit &&
                      <TextField
                        placeholder='Notes'
                        fullWidth
                        value={this.state.desc}
                        error={Boolean(this.state.descEmsg)}
                        helperText={this.state.descEmsg}
                        onChange={evt => this.set('desc', evt.target.value)}
                      />}
                    {!this.state.edit &&
                      this.state.tsc.desc}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Amount
                  </TableCell>
                  <TableCell numeric>
                    {this.state.tsc.amntDesc}
                    <ExtLink to={tscUrl} linkIcon />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <ExtLink
              to={tscUrl}
              style={{textDecoration: 'none'}}
              txt={
                <Button
                  raised
                  color={'contrast'}
                  style={{width: '100%', marginTop: theme.spacing.unit * 2, marginBottom: theme.spacing.unit}}
                  >
                    Detailed transaction
                    <Launch />
                </Button>
              }
            />
          </Paper>
        </div>
      )
    } else {
      return <LinearProgress />
    }
  }
}
