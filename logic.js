const config = {
    parking_lot: {x: 200, y: 100}, //the stage
    world: {
        scl_c: 6, //scaling constant, pixels per meter
        wr_c: Math.PI/4/20, //wheel rotation constant
        mwta_c: Math.PI/4, //max wheel turning angle
        sp: {x: 100, y: 50}, //starting position
        /* the fundamental movement constant
         * (nothing more than a rendering rate for HTML animtaion callbacks)
         */
        fmv_c: 1/60
    },
    car: {
        dw: 2.39, //distance between the wheels
        dims: {x: 1.72, y: 3.02} //dimensions of the car

    }
}

class World {
    constructor(config) {
        this.parking_lot = new ParkingLot(config.parking_lot.x, config.parking_lot.y, config.world)
        this.car = new Car(
            config.car.dw,
            config.car.dims,
            config.world
        )
        this.cnv = document.querySelector('#cnv') || null
        this.ctx = this.cnv ? this.cnv.getContext('2d') : null
    }

    render() {
        this.ctx.clearRect(0, 0, cnv.width, cnv.height)
        this.parking_lot.render(this.ctx)
        this.car.render(this.ctx)
    }
}

class ParkingLot {
    constructor(x, y, world) {
        this.x = x
        this.y = y
        this.world = world
    }

    render(ctx) {
        ctx.strokeRect(0, 0, this.world.scl_c*this.x, this.world.scl_c*this.y)
    }
}

class Car {
    constructor(dw, dims, world) {
        this.dw = dw //distance between the wheels
        this.dim_x = dims.x; this.dim_y = dims.y //dimensions of the car {x, y}
        this.x = world.sp.x; this.y = world.sp.y //starting position
        this.wr = 1 //how fast the steering wheel turns (factor to the world wr_c constant)
        this.orient = 0 //the angle between bottom edge (of the screen) and the x-axis of the car
        this.wheel_alpha = 0 //angle the steering wheel is (and forward wheels are) turned by
        this.v = 0 //car velocity
        this.a = 0 //car acceleration
        this.reverse = 1 //1 for forward, -1 for reverse
        this.world = world //ref to the world and its constants
    }

    movementTick() {
        const abswa = Math.abs(this.wheel_alpha)
        const tg2abswa = Math.tan(abswa)*Math.tan(abswa)
        const r = abswa != 0 ? Math.sqrt(this.dw*this.dw*(1/tg2abswa+1/4)+this.dw*this.dim_x/Math.tan(abswa)+(this.dim_x*this.dim_x)/4) : Number.POSITIVE_INFINITY
        const wdir = this.wheel_alpha > 0 ? 1 : this.wheel_alpha === 0 ? 0 : -1
        const d = this.v*this.world.fmv_c
        const ticka = Number.isFinite(r) ? 2*Math.asin(d/(2*r)) : 0
        const dx = ticka ? this.reverse*wdir*d*Math.cos(Math.PI/2-(-wdir)*this.orient-ticka/2) : this.reverse*-d*Math.sin(this.orient)
        const dy = ticka ? this.reverse*d*Math.sin(Math.PI/2-(-wdir)*this.orient-ticka/2) : this.reverse*d*Math.cos(this.orient)
        
        this.x += dx; this.y += dy
        const oridelt = wdir > 0 ? -ticka : wdir === 0 ? 0 : ticka
        this.orient += this.reverse*oridelt
    }

    // dir: +1 - to the right, -1 - to the left
    spinWheel(dir) {
        let delta = this.wheel_alpha >= this.world.mwta_c && dir > 0 || this.wheel_alpha <= -this.world.mwta_c && dir < 0 ? 0 : dir*this.wr*this.world.wr_c
        this.wheel_alpha += delta
    }

    // simply sets constant velocity (for now)
    stepGasPedal(v) {
        this.v = v
    }

    releaseGasPedal() {}

    stepBreakPedal() {
        this.v = 0
    }

    releaseBreakPedal() {}

    render(ctx) {
        let cos = Math.cos(this.orient), sin = Math.sin(this.orient)
        let s = this.world.scl_c
        //world coordinates
        let ul_x = this.x*s+cos*(-this.dim_x/2*s)-sin*( this.dw/2*s), ul_y = this.y*s+sin*(-this.dim_x/2*s)+cos*( this.dw/2*s),
            ur_x = this.x*s+cos*( this.dim_x/2*s)-sin*( this.dw/2*s), ur_y = this.y*s+sin*( this.dim_x/2*s)+cos*( this.dw/2*s),
            br_x = this.x*s+cos*( this.dim_x/2*s)-sin*(-this.dw/2*s), br_y = this.y*s+sin*( this.dim_x/2*s)+cos*(-this.dw/2*s),
            bl_x = this.x*s+cos*(-this.dim_x/2*s)-sin*(-this.dw/2*s), bl_y = this.y*s+sin*(-this.dim_x/2*s)+cos*(-this.dw/2*s)
        //canvas coordinates
        ctx.beginPath()
        ctx.moveTo(ul_x, ctx.canvas.height-ul_y)
        ctx.lineTo(ur_x, ctx.canvas.height-ur_y)
        ctx.lineTo(br_x, ctx.canvas.height-br_y)
        ctx.lineTo(bl_x, ctx.canvas.height-bl_y)
        ctx.lineTo(ul_x, ctx.canvas.height-ul_y)
        ctx.stroke()
    }
}

class UI {
    constructor(world) {
        this.world = world
        this.up = false
        this.revrs = false
        this.right = false
        this.left = false
    }

    set up(val) {
        let v = val ? 10 : 0
        this.world.car.stepGasPedal(v)
    }

    set right(val) {
        this.world.car.spinWheel(val ? 1 : 0)
    }

    set left(val) {
        this.world.car.spinWheel(val ? -1 : 0)
    }

    set reverse(val) {
        this.revrs = val
        this.world.car.reverse = val ? -1 : 1
    }

    render() {
        this.world.car.movementTick()
        this.world.render()
    }

    report() {
        console.log('car wheel', this.world.car.wheel_alpha)
        console.log('car orient', this.world.car.orient)
        console.log('car x', this.world.car.x, 'car y', this.world.car.y)
    }
}

(function init() {
    const ui = new UI(new World(config))
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case "ArrowUp":
                ui.up = true
                break
            case "ArrowLeft":
                ui.left = true
                break
            case "KeyR":
                ui.reverse = !ui.revrs
                break
            case "ArrowRight":
                ui.right = true
                break
            case "Space":
                e.preventDefault()
                ui.report()
                break
            default:
                break
        }
    })
    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case "ArrowUp":
                ui.up = false
                break
            case "ArrowLeft":
                ui.left = false
                break
            case "ArrowRight":
                ui.right = false
                break
            default:
                break
        }
    })
    const draw = () => {
        ui.render()
        window.requestAnimationFrame(draw)
    }
    draw()
})()

function test() {
    let c = new Car(config.car.dw, config.car.dims, config.world), i = 0
    while (i++ < 2) c.spinWheel(1)
    console.log('wheel angle', c.wheel_alpha)
    while (i-- > 1) c.spinWheel(-1)
    console.log('wheel angle', c.wheel_alpha)
}
