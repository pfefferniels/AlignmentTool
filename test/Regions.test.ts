import { Region, Regions } from '../src/error-detection/Regions'

describe('Regions', function() {
    it('contains non overlapping regions', function() {
        const regions = new Regions()
        regions.add(new Region(1, 2))
        regions.add(new Region(3, 4))
        expect(regions.regions).toEqual([ new Region(1, 2), new Region(3, 4)])
    })

    it('merges partially overlapping regions', function() {
        const regions = new Regions()
        regions.add(new Region(0, 4))
        regions.add(new Region(1, 2))
        regions.add(new Region(1, 3))
        expect(regions.regions).toEqual([ new Region(0, 4) ])
    })

    it('detects overlapping regions', function() {
        const regions = new Regions()
        regions.add(new Region(0, 4))
        expect(regions.isOverlapping(new Region(2, 6))).toBe(true)
    })
})
