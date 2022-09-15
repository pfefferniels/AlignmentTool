import { findLastIndex } from "../BasicCalculation"

export class Region {
    left: number
    right: number

    constructor(left: number, right: number) {
        this.left = left
        this.right = right
    }

    isOverlapping(other: Region) {
        // left or right side is within the current region
        if (this.contains(other.left) || this.contains(other.right)) return true

        // left or right side of current region is within the given region
        if (other.contains(this.left) || other.contains(this.right)) return true

        return false
    }

    contains(otherNumber: number) {
        return otherNumber >= this.left && otherNumber <= this.right
    }
}

export class Regions {
    /**
     * Non-overlapping and ordered intervals
     */
    regions: Region[]

    constructor() {
        this.regions = []
    }

    /**
     * Adds a region and merges it with the existing ones
     * @param region
     */
    add(region: Region) {
        if (region.left >= region.right)
            throw new Error(`invalid region: ${region.left} must be smaller then ${region.right}`)

        const startPos = findLastIndex(this.regions, r => r.contains(region.left)) 
        const endPos = findLastIndex(this.regions, r => r.contains(region.right))

        if (startPos === -1 && endPos === -1) {
            for (let i = this.regions.length - 1; i >= 0; i--) {
                if (this.regions[i].left < region.right && this.regions[i].right > region.left)
                    this.regions.splice(i, 1)
            }
        }
        else if (startPos === -1 && endPos !== -1) {
            region.right = this.regions[endPos].right
            for (let i = endPos; i >= 0; i--) {
                if (this.regions[i].right > region.left)
                    this.regions.splice(i, 1)
            }
        }
        else if (startPos !== -1 && endPos === -1) {
            region.left = this.regions[startPos].left
            for (let i = this.regions.length - 1; i >= startPos; i--) {
                if (this.regions[i].left <= region.right)
                    this.regions.splice(i, 1)
            }
        } else {
            region.left = this.regions[startPos].left;
            region.right = this.regions[endPos].right;
            for (let i = endPos; i >= startPos; i -= 1) {
                this.regions.splice(i, 1)
            }
        }

        let insertPos = findLastIndex(this.regions, r => region.left > r.left)

        this.regions.splice(insertPos + 1, 0, region)
    }

    /**
     * Checks whether a given region is overlapping with any 
     * of the regions.
     * 
     * @param otherRegion 
     * @returns boolean
     */
    isOverlapping(otherRegion: Region): boolean {
        return this.regions.some(region => region.isOverlapping(otherRegion))
    }
}

