import { Box, Button, Flex, Image, Input, InputGroup, InputLeftElement, Stack, useToast } from '@chakra-ui/react'
import { collection, addDoc, GeoPoint, Timestamp, onSnapshot, query, where, limit } from "firebase/firestore";
import { firestore } from '../../config/firebase';
import { useGeolocated } from "react-geolocated";
import { EditIcon } from '@chakra-ui/icons'
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import PigeonMap from '../../components/PigeonMap';
import { useAttendance } from '../../context/AttendanceContext';
import { FiCamera } from 'react-icons/fi'
import { useRouter } from 'next/router';
import axios from 'axios';
import cdnConfig from '../../config/cdn';

const AttendanceForm = () => {
  const router = useRouter()
  const toast = useToast()
  const { user } = useAuth()
  const { attendance, setAttendance } = useAttendance()
  
  const [attendances, setAttendances] = useState([])

  const checklogCollection = collection(firestore, "checklogs")

  useEffect(() => {
    const unsub = onSnapshot(
      query(checklogCollection, where('email', '==', user.email), limit(2)
    ), (querySnapshot) => {
      const items = []
      querySnapshot.forEach((doc) => {
        items.push(doc.data())
      })
      setAttendances(items)
      console.log('items:')
      console.log(items)
    })
    return () => {
      unsub()
    }
  }, [])
  

  const { coords, isGeolocationAvailable, isGeolocationEnabled } =
    useGeolocated({
      positionOptions: {
          enableHighAccuracy: false,
      },
      userDecisionTimeout: 5000,
  });

  const clock = async (type) => {
    let imageUrl = attendance.imageUrl
    if (!attendance.imageUrl) {
      const uploadImage = await axios.post(cdnConfig.url, {
        image: attendance.base64Image
      }, {
        headers: {
            'X-API-KEY': cdnConfig.apiKey
        }
      })
      imageUrl = uploadImage.data.data.image_url
      setAttendance({...attendance, imageUrl: imageUrl})
    }

    if (!imageUrl) {
      toast({
        title: formatAttendanceType(type) + ' failed',
        description: 'please take photo first',
        status: 'error',
        duration: 6000,
        isClosable: true,
      })
      return
    }

    try {
      const now = Date.now()
      const docRef = await addDoc(collection(firestore, "checklogs"), {
        email: user.email,
        name: user.displayName,
        coordinate: new GeoPoint(coords?.latitude || 0, coords?.longitude || 0),
        image_url: imageUrl,
        note: attendance.note,
        timestamp: new Timestamp(Math.floor(now / 1000), 0),
        type
      });
      setAttendance({...attendance, note:'', base64Image:'', imageUrl: ''})
      console.log("Document written with ID: ", docRef.id);
      router.push('/attendance')
      toast({
        title: formatAttendanceType(type) + ' success',
        status: 'success',
        duration: 6000,
        isClosable: true,
      })
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        title: formatAttendanceType(type) + ' failed',
        description: e.message,
        status: 'error',
        duration: 6000,
        isClosable: true,
      })
    }
  }

  const takePhoto = () => {
    router.push('/attendance/selfie')
  }

  const formatAttendanceType = (str) => {
    str = str.replace(/_/g, " ")
    str = str.toLowerCase()
    return str
  }

  return (
    <Flex
      justify="center"
      minH={"100vh"}
      bg="gray.100"
      w="full"
    >
      <Box w="full">
        <Box w="full" height={'200px'}>
          <PigeonMap center={[coords?.latitude || 0,coords?.longitude || 0]} zoom={17} />
        </Box>

        <Flex w="full" px={0} justifyContent={'center'}>
          <Box
            marginTop={{base:0, md:6}}
            rounded={"lg"}
            bg="white"
            p={8}
            w="full"
            maxW="md"
          >
            <Stack spacing={4}>
              <InputGroup>
                <InputLeftElement
                  pointerEvents='none'
                  children={<EditIcon color='gray.300' />}
                />
                <Input variant='flushed' type='text' placeholder='Notes' value={attendance.note} onChange={(e) => {
                  setAttendance({...attendance, note: e.target.value })
                }} />
              </InputGroup>

              <InputGroup>
              <InputLeftElement
                  pointerEvents='none'
                  color={'gray.300'}
                  children={<FiCamera />}
                />
                {attendance.base64Image ? (
                  <Input variant='flushed' placeholder='Photo' readOnly={true} height={attendance.base64Image ? '180px' : ''}/>
                ) : (
                  <Input variant='flushed' placeholder='Photo' readOnly={true} />
                )}
                {attendance.base64Image ? (
                  <InputLeftElement width={'160px'} paddingLeft={10} top={'85px'}>
                    <Image
                      borderRadius='md'
                      boxSize='120px'
                      src={attendance.base64Image}
                      alt='photo'
                    />
                  </InputLeftElement>
                ) : null}
                <InputLeftElement width={'8.5rem'} paddingLeft={10}>
                  <Button h='1.75rem' size='sm' onClick={takePhoto}>
                    Take Photo
                  </Button>
                </InputLeftElement>
              </InputGroup>

              <Button textTransform={'capitalize'} colorScheme='blue' w="full" onClick={() => clock(attendance.type)}>
                { formatAttendanceType(attendance.type) }
              </Button>
            </Stack>
          </Box>
        </Flex>
      </Box>
    </Flex>
    );
  }
  
  export default AttendanceForm
  