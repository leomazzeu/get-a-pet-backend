const Pet = require('../models/Pet')

//helpers
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const ObjectId = require('mongoose').Types.ObjectId

module.exports = class PetController {

  // create a pet
  static async create(req, res) {
    
    const { name, age, weight, color } = req.body
    const images = req.files

    const available = true

    //images upload

    //validation
    if(!name) {
      res.status(422).json({message: "O nome é obrigatório!"})
      return
    }

    if(!age) {
      res.status(422).json({message: "A idade do pet é obrigatória!"})
      return
    }

    if(!weight) {
      res.status(422).json({message: "O peso do pet é obrigatório!"})
      return
    }

    if(!color) {
      res.status(422).json({message: "A cor do pet é obrigatória!"})
      return
    }

    if(images.length === 0) {
      res.status(422).json({message: "A imagem do pet é obrigatória!"})
      return
    }

    //get pet owner
    const token = getToken(req)
    const user = await getUserByToken(token)

    //create a pet
    const pet = new Pet({name, age, weight, color, available, images: [], 
    user: {
      _id: user._id,
      name: user.name,
      image: user.image,
      phone: user.phone
    }})

    images.map((image) => {
      pet.images.push(image.filename)
    })

    try {
      
      const newPet = await pet.save()
      res.status(201).json({
        message: "Pet cadastrado com sucesso!",
        newPet
      })

    } catch (error) {
      res.status(500).json({message: error})
    }
  }

  // get all pets
  static async getAll(req, res) {
    const pets = await Pet.find().sort('-createdAt') // Pega do mais novo para o mais velho

    res.status(200).json({ pets })
  }

  // get all user pets
  static async getAllUserPets(req, res) {
    
    //get user from token
    const token = await getToken(req)
    const user = await getUserByToken(token)

    const pets = await Pet.find({ 'user._id': user._id }).sort('-createdAt')

    if(pets.length < 1) {
      return res.status(422).json({ message: "Nenhum Pet cadastrado!" })
    }

    res.status(200).json({ pets })
  }

  // get all user adoptions
  static async getAllUserAdoptions(req, res) {
    
    //get user from token
    const token = await getToken(req)
    const user = await getUserByToken(token)

    const pets = await Pet.find({ 'adopter._id': user._id }).sort('-createdAt')

    if(pets.length < 1) {
      return res.status(422).json({ message: "Você não tem nenhum pet adotado!" })
    }

    res.status(200).json({ pets })
  }

  static async getPetById(req, res) {
    const { id } = req.params

    //check if id is valid
    if(!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" })
    }

    //check if pet exists
    const pet = await Pet.findById(id)

    if(!pet) {
      return res.status(404).json({ message: "Pet não encontrado!" })
    }

    res.status(200).json({ pet })
  }

  static async removePetById(req, res) {
    const { id } = req.params

    //check if id is valid
    if(!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" })
    }

    //check if pet exists
    const pet = await Pet.findById(id)

    if(!pet) {
      return res.status(404).json({ message: "Pet não encontrado!" })
    }

    //check if logged in user registered the pet
    const token = getToken(req)
    const user = await getUserByToken(token)


    if(pet.user._id.toString() !== user._id.toString()) {
      return res.status(422).json({ message: "Houve um problema em processar a sua solicitação, tente novamente mais tarde!" })
    }

    await Pet.findByIdAndRemove(id)

    res.status(200).json({ message: "Pet removido com sucesso!" })
  }

  static async updatePet(req, res) {
    const { id } = req.params

    //check if id is valid
    if(!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" })
    }

    const { name, age, weight, color, available } = req.body

    //check if pet exists
    const pet = await Pet.findById(id)

    if(!pet) {
      return res.status(404).json({ message: "Pet não encontrado!" })
    }

    const images = req.files

    const updatedData = {}

    //check if logged in user registered the pet
    const token = getToken(req)
    const user = await getUserByToken(token)

    if(pet.user._id.toString() !== user._id.toString()) {
      return res.status(422).json({ message: "Houve um problema em processar a sua solicitação, tente novamente mais tarde!" })
    }

    //validations
    if(!name) {
      res.status(422).json({message: "O nome é obrigatório!"})
      return
    } else {
      updatedData.name = name
    }

    if(!age) {
      res.status(422).json({message: "A idade do pet é obrigatória!"})
      return
    } else {
      updatedData.age = age
    }

    if(!weight) {
      res.status(422).json({message: "O peso do pet é obrigatório!"})
      return
    } else {
      updatedData.weight = weight
    }

    if(!color) {
      res.status(422).json({message: "A cor do pet é obrigatória!"})
      return
    } else {
      updatedData.color = color
    }

    if(images.length === 0) {
      res.status(422).json({message: "A imagem do pet é obrigatória!"})
      return
    } else {
      updatedData.images = []
      images.map((image) => {
        updatedData.images.push(image.filename)
      })
    }

    await Pet.findByIdAndUpdate(id, updatedData)
    console.log(updatedData)

    res.status(200).json({ message: "Pet editado com sucesso!" })
  }

  static async schedule(req, res) {

    const { id } = req.params

    //check if id is valid
    if(!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" })
    }

    //check if pet exist
    const pet = await Pet.findById(id)

    if(!pet) {
      return res.status(404).json({ message: "Pet não encontrado!" })
    }

    //check if user registered the pet
    const token = getToken(req)
    const user = await getUserByToken(token)

    if(pet.user._id.toString() === user._id.toString()) {
      return res.status(422).json({ message: "Você não pode agendar uma visita com o seu próprio pet!" })
    }

    //check if user has already chedule a visit
    if(pet.adopter) {
      if(pet.adopter._id.equals(user._id)) {
        return res.status(422).json({ message: "Você já agendou uma visita para este pet!" })
      }
    }

    //add user to pet
    pet.adopter = {
      _id: user._id,
      name: user.name,
      image: user.image
    }

    await Pet.findByIdAndUpdate(id, pet)

    res.status(200).json({
      message: `A visita foi agendada com sucesso, entre em contato com ${pet.user.name} pelo telefone ${pet.user.phone}.`
    })

  }

  static async concludeAdoption(req, res) {
    const { id } = req.params

    //check if id is valid
    if(!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" })
    }

    //check if pet exist
    const pet = await Pet.findById(id)

    if(!pet) {
      return res.status(404).json({ message: "Pet não encontrado!" })
    }

    //check if user registered the pet
    const token = getToken(req)
    const user = await getUserByToken(token)

    if(pet.user._id.toString() !== user._id.toString()) {
      return res.status(422).json({ message: "Você não tem permissão para concluir a adoção de um pet que não é seu!" })
    }

    //check if pet are adoptered
    if(pet.available !== true) {
      return res.status(422).json({ message: "Este PET já foi adotado!" })
    }

    pet.available = false

    await Pet.findByIdAndUpdate(id, pet)

    res.status(200).json({ message: 'Parabéns! O ciclo de adoção foi realizado com sucesso!' })
  }

}